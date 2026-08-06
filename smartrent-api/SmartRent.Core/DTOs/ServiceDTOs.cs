namespace SmartRent.Core.DTOs;

public record ServiceDto(
    Guid Id, string Name, decimal Price,
    string Unit, string? Icon, bool IsActive, DateTime CreatedAt
);

public record CreateServiceRequest(string Name, decimal Price, string Unit, string? Icon);
public record UpdateServiceRequest(string Name, decimal Price, string Unit, string? Icon, bool IsActive);
