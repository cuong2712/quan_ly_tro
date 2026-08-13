using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;

namespace SmartRent.API.Controllers;

// Controller xử lý tải lên (Upload) hình ảnh và tài liệu cho hệ thống SmartRent
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController(FileService fileService) : ControllerBase
{
    // Upload ảnh đại diện Avatar
    [HttpPost("upload-avatar")]
    public async Task<IActionResult> UploadAvatar([FromForm] IFormFile file)
    {
        try
        {
            var url = await fileService.UploadImageAsync(file, "avatars");
            return Ok(new { url, message = "Upload ảnh đại diện thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Upload ảnh CCCD (Mặt trước / Mặt sau)
    [HttpPost("upload-cccd")]
    public async Task<IActionResult> UploadCccd([FromForm] IFormFile file)
    {
        try
        {
            var url = await fileService.UploadImageAsync(file, "cccd");
            return Ok(new { url, message = "Upload ảnh CCCD thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Upload ảnh hóa đơn / Chứng từ thanh toán
    [HttpPost("upload-payment-proof")]
    public async Task<IActionResult> UploadPaymentProof([FromForm] IFormFile file)
    {
        try
        {
            var url = await fileService.UploadImageAsync(file, "payments");
            return Ok(new { url, message = "Upload ảnh chứng từ thanh toán thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Upload tài liệu file hợp đồng (PDF, DOCX)
    [HttpPost("upload-document")]
    public async Task<IActionResult> UploadDocument([FromForm] IFormFile file)
    {
        try
        {
            var url = await fileService.UploadDocumentAsync(file, "documents");
            return Ok(new { url, message = "Upload tài liệu hợp đồng thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
