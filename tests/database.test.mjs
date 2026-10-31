import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("PostgreSQL: permisos, venta atómica, stock e idempotencia", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');`);
    await db.exec(
      await readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(`insert into public.admins values('00000000-0000-0000-0000-000000000001');
 insert into public.products(id,code,name,category,price,image_url) values('10000000-0000-0000-0000-000000000001','TEST-001','Producto generico','Hombre',100,'https://example.org/photo.jpg');
 insert into public.products(code,name,category,price,image_url,active) values('TEST-HIDDEN','Producto oculto','Mujer',200,'https://example.org/photo.jpg',false);
 insert into public.variants(id,product_id,sku,size,system,color,stock) values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','TEST-EU-38','38','EU','Azul',3);`);
    await db.exec("set role anon");
    assert.equal((await db.query("select * from products")).rows.length, 1);
    await assert.rejects(
      db.exec(
        `insert into products(code,name,category,price,image_url) values('X','X','Hombre',1,'https://example.org')`,
      ),
    );
    await assert.rejects(
      db.exec(
        `select public.record_sale('20000000-0000-0000-0000-000000000001',1,'30000000-0000-0000-0000-000000000001')`,
      ),
    );
    await db.exec(
      `reset role; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false)`,
    );
    assert.equal((await db.query("select * from sales")).rows.length, 0);
    await assert.rejects(
      db.exec(
        `insert into admins values('00000000-0000-0000-0000-000000000002')`,
      ),
    );
    await assert.rejects(
      db.exec(
        `select public.record_sale('20000000-0000-0000-0000-000000000001',1,'30000000-0000-0000-0000-000000000001')`,
      ),
    );
    await db.exec(
      `select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false)`,
    );
    assert.equal((await db.query("select * from products")).rows.length, 2);
    const sale = `select public.record_sale('20000000-0000-0000-0000-000000000001',2,'30000000-0000-0000-0000-000000000001')`;
    await db.exec(sale);
    await db.exec(sale);
    assert.equal(
      (await db.query("select stock from variants")).rows[0].stock,
      1,
    );
    const result = (await db.query("select * from sales")).rows;
    assert.equal(result.length, 1);
    assert.equal(Number(result[0].total), 200);
    await assert.rejects(
      db.exec(
        `select public.record_sale('20000000-0000-0000-0000-000000000001',2,'30000000-0000-0000-0000-000000000002')`,
      ),
    );
    await assert.rejects(
      db.exec(
        `select public.record_sale('20000000-0000-0000-0000-000000000001',0,'30000000-0000-0000-0000-000000000003')`,
      ),
    );
    assert.equal(
      (await db.query("select stock from variants")).rows[0].stock,
      1,
    );
    assert.equal((await db.query("select * from sales")).rows.length, 1);
    await assert.rejects(db.exec("delete from sales"));
    await db.exec(`delete from products where code='TEST-001'`);
    assert.equal((await db.query("select * from variants")).rows.length, 0);
    assert.equal((await db.query("select * from sales")).rows.length, 1);
  } finally {
    await db.close();
  }
});
