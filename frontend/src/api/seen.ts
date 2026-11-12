/** A record as the person saw it: a delete sends this version and is refused if the record changed since. */
export interface Seen {
  id: string;
  version: number;
}
