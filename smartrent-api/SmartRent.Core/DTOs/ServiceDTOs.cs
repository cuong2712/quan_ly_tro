namespace SmartRent.Core.DTOs;

public record ServiceDto(
    Guid Id, string Name, decimal Price,
    string Unit, string? Icon, bool IsActive, DateTime CreatedAt,
    Guid? ZoneId, string? ZoneName
);

public record CreateServiceRequest(string Name, decimal Price, string Unit, string? Icon, Guid? ZoneId);
public record UpdateServiceRequest(string Name, decimal Price, string Unit, string? Icon, bool IsActive, Guid? ZoneId);
