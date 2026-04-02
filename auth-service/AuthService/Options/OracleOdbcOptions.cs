namespace AuthService.Options;

public sealed class OracleOdbcOptions
{
    public const string SectionName = "OracleOdbc";

    public bool Enabled { get; set; }
    public string ConnectionString { get; set; } = string.Empty;
    public string UsersTableName { get; set; } = "USERS";
    public string RolesTableName { get; set; } = "ROLES";
}
