import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

// GET /api/marketing/reports/top-loyalty-customers
// Query parameters:
// - start_date (YYYY-MM-DD)
// - end_date (YYYY-MM-DD)
// - scope: 'branch' | 'all'
// - branch_id: number (optional; required or enforced for branch marketing managers)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("start_date");
    const endDateParam = searchParams.get("end_date");
    const scopeParam = (searchParams.get("scope") || "branch").toLowerCase();
    const branchIdParam = searchParams.get("branch_id");

    // 1. Authentication and Authorization Check
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required to view loyalty reports." },
        { status: 401 }
      );
    }

    const { role, branch_id: userBranchId, full_name, email } = session;

    // Allowed roles for loyalty reports
    if (!["ADMIN", "MARKETING", "MANAGER"].includes(role)) {
      return NextResponse.json(
        { error: `Forbidden: Role '${role}' is not authorized to access loyalty reports.` },
        { status: 403 }
      );
    }

    // Role-Based Branch Access Enforcement
    const isGlobalUser = role === "ADMIN" || userBranchId === 0 || !userBranchId;
    let effectiveBranchId: number | null = null;

    if (scopeParam === "all") {
      // Chain-wide reports are restricted to ADMIN and authorized head-office managers
      if (!isGlobalUser) {
        return NextResponse.json(
          {
            error:
              "Forbidden: Chain-wide rankings across all branches are restricted to head-office marketing directors and system administrators.",
          },
          { status: 403 }
        );
      }
    } else {
      // Per-branch scope
      if (branchIdParam && branchIdParam !== "ALL") {
        const requestedBranch = Number(branchIdParam);
        if (isNaN(requestedBranch) || requestedBranch <= 0) {
          return NextResponse.json({ error: "Invalid branch_id specified." }, { status: 400 });
        }

        // If the user is a branch-level manager, they cannot view another branch
        if (!isGlobalUser && requestedBranch !== userBranchId) {
          return NextResponse.json(
            {
              error: `Forbidden: You are only authorized to view reports for your assigned branch (Branch #${userBranchId}). Access to Branch #${requestedBranch} was denied.`,
            },
            { status: 403 }
          );
        }
        effectiveBranchId = requestedBranch;
      } else {
        // If no specific branch was passed, non-global users default to their own branch
        if (!isGlobalUser) {
          effectiveBranchId = userBranchId;
        }
      }
    }

    // 2. Date Range Parsing & Validation
    const now = new Date();
    // Default start_date: First day of current month
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    // Default end_date: Today
    const defaultEnd = now.toISOString().slice(0, 10);

    const startDate = startDateParam?.trim() || defaultStart;
    const endDate = endDateParam?.trim() || defaultEnd;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD (e.g. 2026-10-01)." },
        { status: 400 }
      );
    }

    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
      return NextResponse.json({ error: "Invalid date values provided." }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Start date cannot be after end date. Please check your selected ranking period." },
        { status: 400 }
      );
    }

    // 3. Execution of Query based on scope
    if (scopeParam === "all") {
      // SCOPE: All Branches (Chain-wide global ranking)
      const globalQuery = `
        WITH customer_global_points AS (
          SELECT 
            lt.customer_id,
            SUM(lt.points) AS total_points_earned,
            COUNT(DISTINCT lt.loyalty_id) AS transaction_count,
            COUNT(DISTINCT lt.sale_id) AS sales_count,
            COUNT(DISTINCT COALESCE(lt.branch_id, s.branch_id)) AS branches_visited,
            MAX(lt.created_at) AS last_earned_at
          FROM loyalty_transactions lt
          LEFT JOIN sales s ON lt.sale_id = s.sale_id
          WHERE lt.type = 'EARN'
            AND lt.points > 0
            AND lt.created_at >= ? 
            AND lt.created_at < DATE_ADD(?, INTERVAL 1 DAY)
          GROUP BY lt.customer_id
        ),
        ranked_global_customers AS (
          SELECT 
            c.customer_id,
            c.full_name,
            c.card_no,
            c.phone,
            c.email,
            c.tier,
            cgp.total_points_earned,
            cgp.transaction_count,
            cgp.sales_count,
            cgp.branches_visited,
            cgp.last_earned_at,
            DENSE_RANK() OVER (
              ORDER BY cgp.total_points_earned DESC, cgp.last_earned_at ASC
            ) AS rank_num
          FROM customer_global_points cgp
          JOIN customers c ON cgp.customer_id = c.customer_id
          WHERE c.is_active = 1
        )
        SELECT *
        FROM ranked_global_customers
        WHERE rank_num <= 10
        ORDER BY rank_num ASC;
      `;

      const globalResults: any[] = await query(globalQuery, [startDate, endDate]);

      // If we have top customers, fetch branch breakdown for each of them
      let breakdownMap: Record<number, any[]> = {};
      if (globalResults.length > 0) {
        const topCustomerIds = globalResults.map((r) => r.customer_id);
        const placeholders = topCustomerIds.map(() => "?").join(",");

        const breakdownQuery = `
          SELECT 
            lt.customer_id,
            COALESCE(lt.branch_id, s.branch_id, 1) AS branch_id,
            b.name AS branch_name,
            b.branch_code,
            b.city AS branch_city,
            SUM(lt.points) AS branch_points_earned
          FROM loyalty_transactions lt
          LEFT JOIN sales s ON lt.sale_id = s.sale_id
          JOIN branches b ON COALESCE(lt.branch_id, s.branch_id, 1) = b.branch_id
          WHERE lt.type = 'EARN'
            AND lt.points > 0
            AND lt.customer_id IN (${placeholders})
            AND lt.created_at >= ?
            AND lt.created_at < DATE_ADD(?, INTERVAL 1 DAY)
          GROUP BY lt.customer_id, COALESCE(lt.branch_id, s.branch_id, 1), b.name, b.branch_code, b.city
          ORDER BY branch_points_earned DESC
        `;

        const breakdownRows: any[] = await query(breakdownQuery, [
          ...topCustomerIds,
          startDate,
          endDate,
        ]);

        for (const row of breakdownRows) {
          if (!breakdownMap[row.customer_id]) {
            breakdownMap[row.customer_id] = [];
          }
          breakdownMap[row.customer_id].push({
            branch_id: row.branch_id,
            branch_name: row.branch_name,
            branch_code: row.branch_code,
            branch_city: row.branch_city,
            points_earned: Number(row.branch_points_earned || 0),
          });
        }
      }

      // Format response
      const formattedResults = globalResults.map((r) => ({
        rank: Number(r.rank_num),
        customer_id: r.customer_id,
        full_name: r.full_name,
        card_no: r.card_no,
        phone: r.phone,
        email: r.email,
        tier: r.tier,
        total_points_earned: Number(r.total_points_earned),
        transaction_count: Number(r.transaction_count),
        sales_count: Number(r.sales_count),
        branches_visited: Number(r.branches_visited),
        last_earned_at: r.last_earned_at,
        branch_breakdown: breakdownMap[r.customer_id] || [],
      }));

      return NextResponse.json({
        success: true,
        scope: "all",
        date_range: {
          start_date: startDate,
          end_date: endDate,
        },
        user_info: {
          role,
          user_branch_id: userBranchId,
          is_global_user: isGlobalUser,
        },
        total_ranked: formattedResults.length,
        results: formattedResults,
      });
    } else {
      // SCOPE: Per Branch
      let branchFilterClause = "";
      const branchQueryParams: any[] = [startDate, endDate];

      if (effectiveBranchId) {
        branchFilterClause = "AND COALESCE(lt.branch_id, s.branch_id, 1) = ?";
        branchQueryParams.push(effectiveBranchId);
      }

      const branchQuery = `
        WITH customer_branch_points AS (
          SELECT 
            lt.customer_id,
            COALESCE(lt.branch_id, s.branch_id, 1) AS branch_id,
            SUM(lt.points) AS total_points_earned,
            COUNT(DISTINCT lt.loyalty_id) AS transaction_count,
            COUNT(DISTINCT lt.sale_id) AS sales_count,
            MAX(lt.created_at) AS last_earned_at
          FROM loyalty_transactions lt
          LEFT JOIN sales s ON lt.sale_id = s.sale_id
          WHERE lt.type = 'EARN'
            AND lt.points > 0
            AND lt.created_at >= ? 
            AND lt.created_at < DATE_ADD(?, INTERVAL 1 DAY)
            ${branchFilterClause}
          GROUP BY lt.customer_id, COALESCE(lt.branch_id, s.branch_id, 1)
        ),
        ranked_branch_customers AS (
          SELECT
            cbp.branch_id,
            b.name AS branch_name,
            b.branch_code,
            b.city AS branch_city,
            c.customer_id,
            c.full_name,
            c.card_no,
            c.phone,
            c.email,
            c.tier,
            cbp.total_points_earned,
            cbp.transaction_count,
            cbp.sales_count,
            cbp.last_earned_at,
            DENSE_RANK() OVER (
              PARTITION BY cbp.branch_id 
              ORDER BY cbp.total_points_earned DESC, cbp.last_earned_at ASC
            ) AS rank_num
          FROM customer_branch_points cbp
          JOIN customers c ON cbp.customer_id = c.customer_id
          JOIN branches b ON cbp.branch_id = b.branch_id
          WHERE c.is_active = 1
        )
        SELECT *
        FROM ranked_branch_customers
        WHERE rank_num <= 10
        ORDER BY branch_id ASC, rank_num ASC;
      `;

      const branchResults: any[] = await query(branchQuery, branchQueryParams);

      // Group results by branch for easy rendering in frontend
      const groupedByBranch: Record<
        number,
        {
          branch_id: number;
          branch_name: string;
          branch_code: string;
          branch_city: string;
          customers: any[];
        }
      > = {};

      for (const row of branchResults) {
        if (!groupedByBranch[row.branch_id]) {
          groupedByBranch[row.branch_id] = {
            branch_id: row.branch_id,
            branch_name: row.branch_name,
            branch_code: row.branch_code,
            branch_city: row.branch_city,
            customers: [],
          };
        }

        groupedByBranch[row.branch_id].customers.push({
          rank: Number(row.rank_num),
          customer_id: row.customer_id,
          full_name: row.full_name,
          card_no: row.card_no,
          phone: row.phone,
          email: row.email,
          tier: row.tier,
          total_points_earned: Number(row.total_points_earned),
          transaction_count: Number(row.transaction_count),
          sales_count: Number(row.sales_count),
          last_earned_at: row.last_earned_at,
        });
      }

      const flatResults = branchResults.map((row) => ({
        rank: Number(row.rank_num),
        branch_id: row.branch_id,
        branch_name: row.branch_name,
        branch_code: row.branch_code,
        branch_city: row.branch_city,
        customer_id: row.customer_id,
        full_name: row.full_name,
        card_no: row.card_no,
        phone: row.phone,
        email: row.email,
        tier: row.tier,
        total_points_earned: Number(row.total_points_earned),
        transaction_count: Number(row.transaction_count),
        sales_count: Number(row.sales_count),
        last_earned_at: row.last_earned_at,
      }));

      return NextResponse.json({
        success: true,
        scope: "branch",
        date_range: {
          start_date: startDate,
          end_date: endDate,
        },
        filter_branch_id: effectiveBranchId,
        user_info: {
          role,
          user_branch_id: userBranchId,
          is_global_user: isGlobalUser,
        },
        total_ranked: flatResults.length,
        results: flatResults,
        branches: Object.values(groupedByBranch),
      });
    }
  } catch (error: any) {
    console.error("GET /api/marketing/reports/top-loyalty-customers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate top loyalty customer rankings." },
      { status: 500 }
    );
  }
}
