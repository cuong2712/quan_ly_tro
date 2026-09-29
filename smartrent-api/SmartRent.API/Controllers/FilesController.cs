using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Application.Services;

namespace SmartRent.API.Controllers;

public class FileUploadDto
{
    public IFormFile File { get; set; } = null!;
}

public class MultipleFilesUploadDto
{
    public IList<IFormFile> Files { get; set; } = new List<IFormFile>();
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

    // Upload ảnh 360 độ Panorama cho phòng trọ (hỗ trợ tối đa 25MB)
    [HttpPost("upload-panorama")]
    public async Task<IActionResult> UploadPanorama([FromForm] FileUploadDto dto)
    {
        try
        {
            var url = await fileService.UploadPanoramaAsync(dto.File);
            return Ok(new { url, message = "Tải lên ảnh 360° thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Upload ảnh thực tế phòng trọ (1 ảnh)
    [HttpPost("upload-room-image")]
    public async Task<IActionResult> UploadRoomImage([FromForm] FileUploadDto dto)
    {
        try
        {
            var url = await fileService.UploadRoomImageAsync(dto.File);
            return Ok(new { url, message = "Tải lên ảnh phòng thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Upload nhiều ảnh thực tế phòng trọ cùng lúc
    [HttpPost("upload-room-images")]
    public async Task<IActionResult> UploadRoomImages([FromForm] MultipleFilesUploadDto dto)
    {
        try
        {
            var urls = await fileService.UploadRoomImagesAsync(dto.Files);
            return Ok(new { urls, message = "Tải lên các ảnh phòng thành công" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
