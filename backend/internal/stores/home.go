package stores

import "mapp/internal/home"

type HomeStore interface {
	home.ReminderStore
}
