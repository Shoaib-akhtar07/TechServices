using Microsoft.EntityFrameworkCore;

namespace SoftServices.Api.Data;

/// <summary>
/// EnsureCreated only builds a fresh database, so columns added later are created here for
/// databases that already exist. Every step checks first, so it is safe to run on every start.
/// </summary>
public static class SchemaUpgrade
{
    public static async Task RunAsync(AppDbContext db)
    {
        await AddColumnAsync(db, "Users", "SuspendedAt", sqlite: "TEXT NULL", sqlServer: "datetime2 NULL");
    }

    private static async Task AddColumnAsync(AppDbContext db, string table, string column, string sqlite, string sqlServer)
    {
        if (db.Database.IsSqlite())
        {
            var exists = await db.Database
                .SqlQueryRaw<int>($"SELECT COUNT(*) AS \"Value\" FROM pragma_table_info('{table}') WHERE name = '{column}'")
                .SingleAsync();
            if (exists == 0) await db.Database.ExecuteSqlRawAsync($"ALTER TABLE \"{table}\" ADD COLUMN \"{column}\" {sqlite}");
        }
        else if (db.Database.IsSqlServer())
        {
            await db.Database.ExecuteSqlRawAsync(
                $"IF COL_LENGTH('{table}', '{column}') IS NULL ALTER TABLE [{table}] ADD [{column}] {sqlServer}");
        }
    }
}
