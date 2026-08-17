using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;
using System.Security.Claims;

namespace SmartRent.API.Controllers;

// Controller xuất Báo cáo Tài chính & Phân tích Doanh thu - Chi phí - Nợ đọng
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Landlord,SuperAdmin")]
public class ReportsController(ReportService reportService) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Lấy tổng quan báo cáo tài chính (Doanh thu, Nợ đọng, Chi phí bảo trì, Lợi nhuận ròng)
    [HttpGet("financial-summary")]
    [HttpGet("financial")]
    public async Task<IActionResult> GetFinancialSummary()
    {
        var summary = await reportService.GetFinancialSummaryAsync(CurrentUserId);
        return Ok(summary);
    }

    // Xuất file CSV/Excel báo cáo doanh thu tài chính cho Chủ trọ
    [HttpGet("export-excel")]
    [HttpGet("financial/export")]
    public async Task<IActionResult> ExportExcel()
    {
        var fileBytes = await reportService.ExportFinancialCsvAsync(CurrentUserId);
        var fileName = $"BaoCaoDoanhThu_{DateTime.Now:yyyyMMdd}.csv";
        return File(fileBytes, "text/csv; charset=utf-8", fileName);
    }
}
