import { describe, expect, it } from "vitest";
import { splitStatements } from "./apply-wingman-migrations.mjs";

describe("splitStatements", () => {
  it("preserves dollar-quoted PL/pgSQL delimiters without duplicating them", () => {
    const statements = splitStatements(`
      create function public.example()
      returns void
      language plpgsql
      as $$
      begin
        perform 1;
      end;
      $$;
      grant execute on function public.example() to service_role;
    `);

    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain("as $$");
    expect(statements[0]).toContain("$$;");
    expect(statements[0]).not.toContain("$$$;");
    expect(statements[1]).toBe("grant execute on function public.example() to service_role;");
  });

  it("preserves tagged dollar quotes", () => {
    const statements = splitStatements("select $body$one; two$body$; select 2;");

    expect(statements).toEqual(["select $body$one; two$body$;", "select 2;"]);
  });
});
