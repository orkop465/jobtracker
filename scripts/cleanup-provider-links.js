const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    await client.query("BEGIN");

    const affectedUsersRes = await client.query(`
      SELECT DISTINCT a_google."userId" AS "userId"
      FROM "Account" a_google
      INNER JOIN "Account" a_github
        ON a_google."userId" = a_github."userId"
      WHERE a_google.provider = 'google'
        AND a_github.provider = 'github'
    `);

    const affectedUserIds = affectedUsersRes.rows.map((r) => r.userId);

    const deleteRes = await client.query(`
      DELETE FROM "Account"
      WHERE provider = 'github'
        AND "userId" IN (
          SELECT DISTINCT a_google."userId"
          FROM "Account" a_google
          INNER JOIN "Account" a_github
            ON a_google."userId" = a_github."userId"
          WHERE a_google.provider = 'google'
            AND a_github.provider = 'github'
        )
    `);

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          ok: true,
          affectedUsers: affectedUserIds.length,
          removedGithubLinks: deleteRes.rowCount ?? 0,
          affectedUserIds,
        },
        null,
        2
      )
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
