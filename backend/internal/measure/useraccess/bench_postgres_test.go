package useraccess_test

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"slices"
	"testing"
	"time"

	"mapp/internal/access"
	"mapp/internal/people"
	"mapp/internal/platform/actor"
	"mapp/internal/platform/apibench"
	"mapp/internal/platform/authz"
	"mapp/internal/platform/ids"
	"mapp/internal/platform/record"
	"mapp/internal/stores"
)

const volumePeople = 2_000

var hiredAt = time.Date(2026, 3, 12, 9, 0, 0, 0, time.UTC)

type benchPage struct {
	name, path string
}

// BenchmarkUserAccessOnPostgres_SC001 sends the report's requests to the API on PostgreSQL, holding the demo data and
// then 028's volume with 2,000 people, three in four signed in, and reports the time and statements of each.
func BenchmarkUserAccessOnPostgres_SC001(b *testing.B) {
	for _, data := range []apibench.Data{apibench.Demo, apibench.Volume} {
		b.Run(string(data), func(b *testing.B) {
			server := onPostgres(b, data)
			if data == apibench.Volume {
				hire(b, server.Set())
			}
			client := server.SignIn(b, alex)
			for _, p := range userAccessPages() {
				b.Run(p.name, func(b *testing.B) { client.Measure(b, http.MethodGet, p.path, nil) })
			}
		})
	}
}

func userAccessPages() []benchPage {
	return []benchPage{
		{"first page", report},
		{"search", report + "?q=person+12"},
		{"team and every status", report + "?team=T-1001&status=all"},
		{"sorted by last sign-in", report + "?status=all&sort=-lastSignedIn"},
		{"page 50", report + "?page=50"},
		{"export xlsx", exported + "xlsx"},
	}
}

func onPostgres(b *testing.B, data apibench.Data) *apibench.Server {
	b.Helper()
	if testing.Short() || os.Getenv("TEST_DATABASE_URL") == "" {
		b.Skip("needs PostgreSQL at TEST_DATABASE_URL, and no -short")
	}
	return apibench.New(b, data)
}

type hiring struct {
	ctx       context.Context
	b         *testing.B
	set       stores.Set
	generator *ids.Generator
	teams     []people.Team
	viewer    string
}

// hire adds people, each in a team with the Viewer role, up to volumePeople, then signs in three in four of everyone.
func hire(b *testing.B, set stores.Set) {
	b.Helper()
	everyone, err := set.People.List(b.Context())
	if err != nil {
		b.Fatal(err)
	}
	h := hiring{b: b, set: set, generator: ids.NewGenerator(set.Counters), viewer: viewerRole(b, set)}
	if h.teams, err = set.People.ListTeams(b.Context()); err != nil || len(h.teams) == 0 {
		b.Fatalf("the volume's teams: %d, %v", len(h.teams), err)
	}
	err = set.Tx.Write(b.Context(), func(ctx context.Context) error {
		h.ctx = ctx
		return h.hireAll(everyone)
	})
	if err != nil {
		b.Fatalf("hiring the volume's people: %v", err)
	}
}

func viewerRole(b *testing.B, set stores.Set) string {
	b.Helper()
	roles, err := set.Access.ListRoles(b.Context())
	i := slices.IndexFunc(roles, func(r access.Role) bool { return r.BuiltIn == authz.BuiltInViewer })
	if err != nil || i < 0 {
		b.Fatalf("the Viewer role: %v", err)
	}
	return roles[i].ID
}

func (h hiring) hireAll(everyone []people.Person) error {
	personIDs := make([]string, 0, volumePeople)
	for _, p := range everyone {
		personIDs = append(personIDs, p.ID)
	}
	for n := len(everyone) + 1; n <= volumePeople; n++ {
		id, err := h.person(n)
		if err != nil {
			return err
		}
		personIDs = append(personIDs, id)
	}
	return h.signIn(personIDs)
}

func (h hiring) person(n int) (string, error) {
	meta := record.NewMeta(actor.System, hiredAt)
	p := people.Person{ID: h.next(ids.PrefixPerson), Name: fmt.Sprintf("Volume Person %04d", n),
		Email: fmt.Sprintf("volume.person%04d@shell.com", n), JobTitle: "Marketer", Active: true, Meta: meta}
	if err := h.set.People.Put(h.ctx, p); err != nil {
		return "", err
	}
	m := people.Membership{ID: h.next(ids.PrefixTeamMembership), TeamID: h.teams[n%len(h.teams)].ID, PersonID: p.ID,
		Meta: meta}
	if err := h.set.People.PutMembership(h.ctx, m); err != nil {
		return "", err
	}
	a := access.Assignment{ID: h.next(ids.PrefixRoleAssignment), PersonID: p.ID, RoleID: h.viewer,
		ScopeType: authz.ScopeMyTeams, TeamIDs: []string{}, Meta: meta}
	return p.ID, h.set.Access.PutAssignment(h.ctx, a)
}

func (h hiring) signIn(personIDs []string) error {
	for i, id := range personIDs {
		if i%4 == 0 {
			continue
		}
		if err := h.set.Auth.RecordSignIn(h.ctx, id, hiredAt.Add(-time.Duration(i)*90*time.Minute)); err != nil {
			return err
		}
	}
	return nil
}

func (h hiring) next(prefix string) string {
	id, err := h.generator.Next(h.ctx, prefix)
	if err != nil {
		h.b.Fatalf("next %s: %v", prefix, err)
	}
	return id
}
