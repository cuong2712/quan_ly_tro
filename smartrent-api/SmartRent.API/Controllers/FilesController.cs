using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;

namespace SmartRent.API.Controllers;

public class FileUploadDto
{
    public IFormFile File { get; set; } = null!;
}

// Controller xử lý tải lên (Upload) hình ảnh và tài liệu cho hệ thống SmartRent
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController(FileService fileService) : ControllerBase
{
    // Upload ảnh đại diện Avatar
    [HttpPost("upload-avatar")]
    public async Task<IActionResult> UploadAvatar([FromForm] FileUploadDto dto)
    {
        try
        {
            var url = await fileService.UploadImageAsync(dto.File, "avatars");
            return Ok(new { url, message = "Upload ảnh đại diện thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Upload ảnh CCCD (Mặt trước / Mặt sau)
    [HttpPost("upload-cccd")]
    public async Task<IActionResult> UploadCccd([FromForm] FileUploadDto dto)
    {
        try
        {
            var url = await fileService.UploadImageAsync(dto.File, "cccd");
            return Ok(new { url, message = "Upload ảnh CCCD thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Upload ảnh hóa đơn / Chứng từ thanh toán
    [HttpPost("upload-payment-proof")]
    public async Task<IActionResult> UploadPaymentProof([FromForm] FileUploadDto dto)
    {
        try
        {
            var url = await fileService.UploadImageAsync(dto.File, "payments");
            return Ok(new { url, message = "Upload ảnh chứng từ thanh toán thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Upload ảnh minh chứng báo sai sót hóa đơn (công tơ điện, đồng hồ nước, biên lai...)
    [HttpPost("upload-dispute-proof")]
    public async Task<IActionResult> UploadDisputeProof([FromForm] FileUploadDto dto)
    {
        try
        {
            var url = await fileService.UploadImageAsync(dto.File, "disputes");
            return Ok(new { url, message = "Upload ảnh minh chứng báo sai thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Upload tài liệu file hợp đồng (PDF, DOCX)
    [HttpPost("upload-document")]
    public async Task<IActionResult> UploadDocument([FromForm] FileUploadDto dto)
    {
        try
        {
            var url = await fileService.UploadDocumentAsync(dto.File, "documents");
            return Ok(new { url, message = "Upload tài liệu hợp đồng thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
