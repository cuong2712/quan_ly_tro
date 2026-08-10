namespace SmartRent.Core.DTOs;

public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalItems,
    int PageNumber,
    int PageSize,
    int TotalPages
)
{
    public static PagedResult<T> Create(IEnumerable<T> items, int totalItems, int pageNumber, int pageSize)
    {
        var size = pageSize > 0 ? pageSize : 10;
        var page = pageNumber > 0 ? pageNumber : 1;
        var totalPages = (int)Math.Ceiling(totalItems / (double)size);
        return new PagedResult<T>(items, totalItems, page, size, totalPages > 0 ? totalPages : 1);
    }
}
