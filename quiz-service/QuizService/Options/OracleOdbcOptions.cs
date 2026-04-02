namespace QuizService.Options;

public sealed class OracleOdbcOptions
{
    public const string SectionName = "OracleOdbc";

    public bool Enabled { get; set; }
    public string ConnectionString { get; set; } = string.Empty;
    public string CategoriesTableName { get; set; } = "CATEGORIES";
    public string QuestionsTableName { get; set; } = "QUESTIONS";
    public string IndividualAnswersTableName { get; set; } = "INDIVIDUAL_ANSWERS";
    public string UsersTableName { get; set; } = "USERS";
    public string RolesTableName { get; set; } = "ROLES";
}
