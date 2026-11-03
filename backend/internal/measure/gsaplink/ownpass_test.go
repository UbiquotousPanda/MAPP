package gsaplink_test

import (
	"bytes"
	"net/http"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/google/go-cmp/cmp"

	"mapp/internal/measure/gsaplink"
	"mapp/internal/platform/apitest"
	"mapp/internal/platform/sheet"
)

const (
	lea        = "lea.santos@shell.com"
	exported   = "/api/v1/reports/gsap-link/export?year=2026"
	lubricants = "P-1001"
)

// exportFile is a CSV export read back: the notes before the table, by label, and the table's rows.
type exportFile struct {
	notes map[string]string
	rows  [][]string
}

func csvOf(t *testing.T, c *apitest.Client, query string) exportFile {
	t.Helper()
	head, table, found := bytes.Cut(get(t, c, exported+"&format=csv"+query, http.StatusOK).Body, []byte("\n\n"))
	notes, err := sheet.ReadCSV(head, 100)
	rows, tableErr := sheet.ReadCSV(table, 10000)
	if !found || err != nil || tableErr != nil {
		t.Fatalf("export %s: notes and table not read (%v, %v)", query, err, tableErr)
	}
	f := exportFile{notes: map[string]string{}, rows: textOf(rows.Rows)}
	for _, n := range notes.Rows {
		f.notes[n.Cell(0)] = n.Cell(1)
	}
	return f
}

func workbookOf(t *testing.T, c *apitest.Client, query string) []sheet.Table {
	t.Helper()
	tables, err := sheet.ReadXLSX(get(t, c, exported+"&format=xlsx"+query, http.StatusOK).Body, 10000)
	if err != nil {
		t.Fatalf("workbook %s: %v", query, err)
	}
	return tables
}

// textOf is the rows' cells without the empty cells that end a row, which a workbook does not keep.
func textOf(rows []sheet.Row) [][]string {
	text := [][]string{}
	for _, r := range rows {
		cells := slices.Clone(r.Cells)
		for len(cells) > 0 && cells[len(cells)-1] == "" {
			cells = cells[:len(cells)-1]
		}
		text = append(text, cells)
	}
	return text
}

// asRead is a CSV's rows as a workbook reads them back: a moment keeps its date only.
func asRead(rows [][]string) [][]string {
	moment := regexp.MustCompile(`^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$`)
	read := [][]string{}
	for _, r := range rows {
		cells := slices.Clone(r)
		for i, c := range cells {
			if moment.MatchString(c) {
				cells[i] = c[:10]
			}
		}
		read = append(read, cells)
	}
	return read
}

func moment(at time.Time) string { return at.UTC().Format("2006-01-02 15:04") }

func yes(b bool) string {
	if b {
		return "Yes"
	}
	return "No"
}

func swbsRows(r gsaplink.Report) [][]string {
	rows := [][]string{{"Line item ID", "Line item", "Plan", "Campaign", "Initiative", "Activity", "Owner", "Company code",
		"Approved on", "Waiting (hours)", "Over 48 hours"}}
	for _, x := range r.Swbs.Rows {
		rows = append(rows, []string{x.LineItemID, x.LineItem, x.Path.Plan, x.Path.Campaign, x.Path.Initiative,
			x.Path.Activity, x.Owner, x.CompanyCode, moment(x.ApprovedAt), strconv.Itoa(x.WaitingHours), yes(x.OverTurnaround)})
	}
	return rows
}

func bandRows(r gsaplink.Report) [][]string {
	rows, total := [][]string{{"Waiting", "Line items"}}, 0
	for _, b := range r.Swbs.Bands {
		rows, total = append(rows, []string{b.Label, strconv.Itoa(b.Count)}), total+b.Count
	}
	return append(rows, []string{"Total", strconv.Itoa(total)})
}

// waitingRows leave a hidden amount empty, as the screen shows "—".
func waitingRows(r gsaplink.Report) [][]string {
	rows := [][]string{{"Purchase request ID", "Purchase request", "Vendor", "Owner", "Plan", "Campaign", "Initiative",
		"Activity", "Routed on", "Routing", "GSAP PR number", "Amount (" + r.Currency + ")", "Waiting (working days)",
		"Over 2 working days"}}
	for _, x := range r.Waiting.Rows {
		amount := ""
		if x.Amount != nil {
			amount = x.Amount.Amount.String()
		}
		rows = append(rows, []string{x.PurchaseRequestID, x.Name, x.Vendor, x.Owner, x.Path.Plan, x.Path.Campaign,
			x.Path.Initiative, x.Path.Activity, moment(x.RoutedAt), map[string]string{"original": "Original",
				"modification": "Modification"}[x.Routing], x.GsapPrNumber, amount, strconv.Itoa(x.WaitingWorkingDays),
			yes(x.OverTurnaround)})
	}
	return rows
}

func orderRows(r gsaplink.Report) [][]string {
	in := " (" + r.Currency + ")"
	rows := [][]string{{"Line item ID", "Line item", "Plan", "Campaign", "Initiative", "Activity", "Purchase request",
		"GSAP PR number", "PO number", "PO lines", "PO date", "Vendor", "PO amount" + in, "Invoiced" + in, "Paid" + in}}
	for _, x := range r.Orders.Rows {
		rows = append(rows, []string{x.LineItemID, x.LineItem, x.Path.Plan, x.Path.Campaign, x.Path.Initiative,
			x.Path.Activity, x.PurchaseRequestID, x.GsapPrNumber, x.PoNumber, strings.Join(x.PoLines, ", "),
			x.PoDate.String(), x.Vendor, x.PoAmount.Amount.String(), x.Invoiced.Amount.String(), x.Paid.Amount.String()})
	}
	totals := r.Orders.Totals
	return append(rows, append([]string{"Total", "", "", "", "", "", "", "", "", "", "", ""},
		totals.PoAmount.Amount.String(), totals.Invoiced.Amount.String(), totals.Paid.Amount.String()))
}

// TestOwnPass_ExportEqualsScreen_FR019_SC005: each tab's file holds its table's every row in the address's sort.
func TestOwnPass_ExportEqualsScreen_FR019_SC005(t *testing.T) {
	t.Parallel()
	carlosSees := apitest.New(t, apitest.WithMeasureDemo()).SignIn(t, carlos)
	tabs := []struct {
		tab, sort, words string
		rows             func(gsaplink.Report) [][]string
	}{{"swbs", "lineItem", "SWBS not received; Line item, ascending", swbsRows},
		{"waiting", "vendor", "Waiting for GSAP; Vendor, ascending", waitingRows},
		{"orders", "-poAmount", "Purchase orders; PO amount, descending", orderRows}}

	for _, tab := range tabs {
		own := "&currency=EUR&tab=" + tab.tab + "&sort=" + tab.sort
		screen := reportOf(t, carlosSees, report+own+"&pageSize=500")
		file := csvOf(t, carlosSees, own+"&widget="+tab.tab)
		if diff := cmp.Diff(tab.rows(screen), file.rows); screen.Total == 0 || diff != "" {
			t.Errorf("%s: %d rows on screen; export (-screen +file):\n%s", own, screen.Total, diff)
		}
		saysTabAndSort(t, file, "EUR", tab.words)
	}
	saysTabAndSort(t, csvOf(t, carlosSees, "&widget=swbs"), "USD", "SWBS not received; Waiting, descending")
	screen := reportOf(t, carlosSees, report+"&currency=EUR")
	if diff := cmp.Diff(bandRows(screen), csvOf(t, carlosSees, "&currency=EUR&widget=swbsBands").rows); diff != "" {
		t.Errorf("Waiting by time (-screen +file):\n%s", diff)
	}
	if bands := bandRows(screen); bands[len(bands)-1][1] != strconv.Itoa(screen.Swbs.Waiting) {
		t.Errorf("bands add up to %s, the Waiting card says %d (FR-007)", bands[len(bands)-1][1], screen.Swbs.Waiting)
	}
}

// saysTabAndSort reports About this export without the report, the currency, or the tab and sort in words (039 FR-022).
func saysTabAndSort(t *testing.T, file exportFile, currency, words string) {
	t.Helper()
	if file.notes["Report"] != "GSAP link" || file.notes["Currency"] != currency ||
		file.notes["Tab"]+"; "+file.notes["Sort"] != words {
		t.Errorf("About this export %v, want GSAP link, %s and %q", file.notes, currency, words)
	}
}

// TestOwnPass_WorkbookEqualsWidgetFiles_US4_2: one sheet per tab and the bands, then In view and About this export.
func TestOwnPass_WorkbookEqualsWidgetFiles_US4_2(t *testing.T) {
	t.Parallel()
	carlosSees := apitest.New(t, apitest.WithMeasureDemo()).SignIn(t, carlos)
	own := "&currency=EUR&tab=orders&sort=-poAmount"

	tables := workbookOf(t, carlosSees, own)
	names := []string{}
	for _, table := range tables {
		names = append(names, table.Name)
	}
	want := []string{"SWBS not received", "Waiting by time", "Waiting for GSAP", "Purchase orders", "In view", "About this export"}
	if diff := cmp.Diff(want, names); diff != "" {
		t.Fatalf("sheets (-want +got):\n%s", diff)
	}
	for i, widget := range []string{"swbs", "swbsBands", "waiting", "orders"} {
		file := csvOf(t, carlosSees, own+"&widget="+widget)
		if diff := cmp.Diff(asRead(file.rows), textOf(tables[i].Rows)); diff != "" {
			t.Errorf("sheet %s against the %s file (-file +sheet):\n%s", names[i], widget, diff)
		}
	}
}

// dashed reports an amount the Waiting for GSAP tab shows of a plan whose financial data the person may not see.
func dashed(t *testing.T, r gsaplink.Report) {
	t.Helper()
	if r.Total == 0 || r.Waiting.Amount != nil || r.Finance.Plans != 0 || r.Finance.Of == 0 {
		t.Errorf("waiting: %d rows, card %v, covers %+v; want rows, no amount card, 0 plans covered", r.Total,
			r.Waiting.Amount, r.Finance)
	}
	for _, row := range r.Waiting.Rows {
		if row.Amount != nil {
			t.Errorf("%s shows %v without finance.view, want null (—)", row.PurchaseRequestID, row.Amount)
		}
	}
}

// TestOwnPass_NoFinanceView_AmountsDashed_FR004: Lea gets "—" for every amount, no purchase order, the SWBS tab in full.
func TestOwnPass_NoFinanceView_AmountsDashed_FR004(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	leaSees, carlosSees := server.SignIn(t, lea), server.SignIn(t, carlos)

	dashed(t, reportOf(t, leaSees, report+"&tab=waiting&pageSize=500"))
	if orders := reportOf(t, leaSees, report+"&tab=orders"); orders.Total != 0 || len(orders.Orders.Rows) != 0 ||
		orders.Finance.Plans != 0 {
		t.Errorf("orders: %d rows covering %+v, want none (US3-6)", orders.Total, orders.Finance)
	}
	all := report + "&pageSize=500"
	if diff := cmp.Diff(swbsRows(reportOf(t, carlosSees, all)), swbsRows(reportOf(t, leaSees, all))); diff != "" {
		t.Errorf("SWBS tab without finance.view (-Carlos +Lea), want it in full (US1-11):\n%s", diff)
	}
}

// grantRoles gives the person, through the access API, a role to see and export every plan without finance.view,
// besides the built-in roles kept with their scope type.
func grantRoles(t *testing.T, server *apitest.Server, personID string, keep map[string]string) {
	t.Helper()
	admin := server.SignIn(t, alex)
	var created struct{ ID string }
	admin.Do(t, http.MethodPost, "/api/v1/roles", map[string]any{"name": "Own pass", "defaultScope": "all",
		"permissions": []string{"plans.view", "reports.view", "data.export"}}).Decode(t, &created)
	roles := []map[string]any{{"roleId": created.ID, "scope": map[string]any{"type": "all"}}}
	for id, scope := range keep {
		roles = append(roles, map[string]any{"roleId": id, "scope": map[string]any{"type": scope}})
	}
	if r := admin.Do(t, http.MethodPut, "/api/v1/people/"+personID+"/roles", map[string]any{"version": 1, "roles": roles}); r.Status != http.StatusOK {
		t.Fatalf("giving %s the roles = %d %s", personID, r.Status, r.Body)
	}
}

// TestOwnPass_ExportWithoutFinanceView_US4_3: with data.export and no finance.view the files hold what the screen shows.
func TestOwnPass_ExportWithoutFinanceView_US4_3(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	grantRoles(t, server, "U-1004", nil)
	meiSees := server.SignIn(t, mei)

	screen := reportOf(t, meiSees, report+"&tab=waiting&pageSize=500")
	if diff := cmp.Diff(waitingRows(screen), csvOf(t, meiSees, "&widget=waiting").rows); screen.Total == 0 || diff != "" {
		t.Errorf("waiting export, %d rows on screen (-screen +file):\n%s", screen.Total, diff)
	}
	orders, sheets := csvOf(t, meiSees, "&widget=orders").rows, workbookOf(t, meiSees, "")
	diff := cmp.Diff(orders, textOf(sheets[3].Rows))
	if len(orders) != 2 || !slices.Equal(orders[1], []string{"Total"}) || diff != "" {
		t.Errorf("purchase orders without finance.view: %v, want no row and Total with no figure (US3-6); "+
			"sheet (-file +sheet):\n%s", orders[1:], diff)
	}
}

// TestOwnPass_FinanceInOnePlan_Covers1Of3_US2_6_US3_6: Priya with finance.view in Lubricants Europe alone.
func TestOwnPass_FinanceInOnePlan_Covers1Of3_US2_6_US3_6(t *testing.T) {
	t.Parallel()
	server := apitest.New(t, apitest.WithMeasureDemo())
	grantRoles(t, server, "U-1002", map[string]string{"RL-1003": "myTeams"})
	priyaSees, carlosSees := server.SignIn(t, priya), server.SignIn(t, carlos)

	waiting := reportOf(t, priyaSees, report+"&tab=waiting&pageSize=500")
	if waiting.Finance.Plans != 1 || waiting.Finance.Of != 3 || waiting.Total == 0 {
		t.Fatalf("waiting covers %+v with %d rows; want 1 of 3 plans and the Measure demo's request", waiting.Finance,
			waiting.Total)
	}
	if amount := waiting.Waiting.Rows[0].Amount; amount != nil {
		t.Errorf("%s of the Measure demo shows %v, want — (US2-6)", waiting.Waiting.Rows[0].PurchaseRequestID, amount)
	}
	orders := reportOf(t, priyaSees, report+"&tab=orders&pageSize=500")
	theirs := reportOf(t, carlosSees, report+"&tab=orders&pageSize=500&plan="+lubricants)
	if diff := cmp.Diff(orderRows(theirs), orderRows(orders)); orders.Finance.Plans != 1 || diff != "" {
		t.Errorf("orders cover %+v; against Lubricants Europe's (-Carlos +Priya):\n%s", orders.Finance, diff)
	}
	if diff := cmp.Diff(orderRows(orders), csvOf(t, priyaSees, "&widget=orders").rows); diff != "" {
		t.Errorf("orders export (-screen +file):\n%s", diff)
	}
}

// TestOwnPass_ExportRights_039_FR022: without data.export every export of the report answers 403.
func TestOwnPass_ExportRights_039_FR022(t *testing.T) {
	t.Parallel()
	leaSees := apitest.New(t, apitest.WithMeasureDemo()).SignIn(t, lea)

	get(t, leaSees, report, http.StatusOK)
	for _, query := range []string{"&format=xlsx", "&format=csv&widget=swbs", "&format=csv&widget=swbsBands",
		"&format=csv&widget=waiting&tab=waiting", "&format=csv&widget=orders&tab=orders&sort=-paid"} {
		get(t, leaSees, exported+query, http.StatusForbidden)
	}
}
