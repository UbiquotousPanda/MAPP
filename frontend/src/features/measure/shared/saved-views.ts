/** Two addresses show the same report whatever their order; the page of a table is not part of a view. */
export function sameQuery(a: string, b: string): boolean {
  const normal = (query: string) => {
    const params = new URLSearchParams(query);
    params.delete('page');
    params.sort();
    return params.toString();
  };
  return normal(a) === normal(b);
}
