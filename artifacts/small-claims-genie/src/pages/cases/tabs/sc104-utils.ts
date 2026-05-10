export function sc104FieldsToBody(f: Record<string, string>): Record<string, unknown> {
  const docsServed: string[] = [];
  if (f["docsServed_sc100"] === "yes") docsServed.push("sc100");
  if ((f["docsServedOther"] ?? "").trim()) docsServed.push("other");
  return { ...f, docsServed };
}
