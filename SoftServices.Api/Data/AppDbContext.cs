using Microsoft.EntityFrameworkCore;

namespace SoftServices.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Usage> Usage => Set<Usage>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<ManualPayment> ManualPayments => Set<ManualPayment>();
    public DbSet<PaymentRecord> PaymentRecords => Set<PaymentRecord>();
    public DbSet<Post> Posts => Set<Post>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.StripeCustomerId).IsUnique();
            e.Property(x => x.Email).HasMaxLength(254);
            e.Property(x => x.Role).HasMaxLength(20);
            e.HasOne(x => x.Subscription).WithOne(x => x.User).HasForeignKey<Subscription>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.Usage).WithOne(x => x.User).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(x => x.ManualPayments).WithOne(x => x.User).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            // Deleting a user keeps their articles, just without an author.
            e.HasMany(x => x.Posts).WithOne(x => x.Author).HasForeignKey(x => x.AuthorId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Usage>().HasIndex(x => new { x.UserId, x.Day }).IsUnique();

        b.Entity<Subscription>(e =>
        {
            e.HasIndex(x => x.UserId).IsUnique();
            e.HasIndex(x => x.StripeSubscriptionId).IsUnique();
            e.HasIndex(x => x.PaypalSubscriptionId).IsUnique();
            e.Ignore(x => x.IsActive);
        });

        b.Entity<Setting>().HasKey(x => x.Key);

        b.Entity<ManualPayment>().HasIndex(x => new { x.Status, x.CreatedAt });

        b.Entity<PaymentRecord>(e =>
        {
            e.HasIndex(x => new { x.Provider, x.ExternalId }).IsUnique();
            e.HasIndex(x => x.CreatedAt);
            e.Property(x => x.Amount).HasPrecision(12, 2);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Post>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => new { x.Published, x.PublishedAt });
            e.Property(x => x.Slug).HasMaxLength(100);
            e.Property(x => x.Title).HasMaxLength(160);
            e.Property(x => x.Description).HasMaxLength(300);
        });
    }

    // All dates are UTC. SQLite does not store the kind, so mark values read back as UTC (JSON then ends in "Z").
    protected override void ConfigureConventions(ModelConfigurationBuilder c)
    {
        c.Properties<DateTime>().HaveConversion<UtcConverter>();
        c.Properties<DateTime?>().HaveConversion<UtcConverter>();
    }

    private class UtcConverter() : Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
        v => v.Kind == DateTimeKind.Utc ? v : v.ToUniversalTime(),
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified)) continue;
            switch (entry.Entity)
            {
                case Subscription s: s.UpdatedAt = now; break;
                case Setting s: s.UpdatedAt = now; break;
                case Post p: p.UpdatedAt = now; break;
            }
        }
        return base.SaveChangesAsync(ct);
    }
}
