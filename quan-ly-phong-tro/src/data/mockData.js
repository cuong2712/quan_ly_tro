// Dữ liệu mẫu toàn diện cho Hệ thống Quản lý Phòng trọ SmartRent

export const initialMockData = {
  // Cấu hình đơn giá điện nước mặc định
  utilityRates: {
    elecPrice: 3500, // 3.500đ / kWh
    waterPrice: 18000, // 18.000đ / m³
  },

  // 1. Danh sách Chủ trọ (Dành cho Super Admin)
  landlords: [
    {
      id: 'L001',
      name: 'Nguyễn Văn Hải',
      phone: '0908123456',
      email: 'hainguyen@landlord.vn',
      status: 'active', // active | locked
      role: 'Chủ trọ Cao cấp',
      zonesCount: 3,
      roomsCount: 24,
      createdAt: '2025-01-15',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'L002',
      name: 'Trần Thị Mai',
      phone: '0912987654',
      email: 'maitran@gmail.com',
      status: 'active',
      role: 'Chủ trọ',
      zonesCount: 2,
      roomsCount: 16,
      createdAt: '2025-02-20',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'L003',
      name: 'Lê Hoàng Nam',
      phone: '0987333444',
      email: 'namle@homeplus.com',
      status: 'locked',
      role: 'Chủ trọ',
      zonesCount: 1,
      roomsCount: 8,
      createdAt: '2025-03-10',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    }
  ],

  // 2. Danh sách Khu trọ (Dành cho Chủ trọ L001)
  zones: [
    {
      id: 'Z001',
      name: 'Khu Trọ SmartRent Quận 1',
      address: '123 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM',
      description: 'Chung cư mini cao cấp đầy đủ nội thất, camera an ninh 24/7',
      landlordId: 'L001',
      totalRooms: 10,
    },
    {
      id: 'Z002',
      name: 'Khu Trọ Xanh Bình Thạnh',
      address: '45/12 D2 (Nguyễn Gia Trí), Phường 25, Bình Thạnh, TP.HCM',
      description: 'Gần các trường ĐH HUTECH, Ngoại Thương, giao thông thuận tiện',
      landlordId: 'L001',
      totalRooms: 8,
    },
    {
      id: 'Z003',
      name: 'Khu Trọ Tân Bình Smart',
      address: '88 Cộng Hòa, Phường 4, Tân Bình, TP.HCM',
      description: 'Phòng studio ban công thoáng mát, thang máy, ra vào vân tay',
      landlordId: 'L001',
      totalRooms: 6,
    }
  ],

  // 3. Danh sách Phòng trọ
  rooms: [
    {
      id: 'R101',
      roomNumber: 'P.101',
      zoneId: 'Z001',
      floor: 1,
      price: 4200000,
      area: 25,
      maxTenants: 2,
      status: 'occupied', // occupied | vacant | maintenance | deposit | locked
      elecMeter: 1240,
      waterMeter: 310,
      description: 'Phòng tầng 1, giường nệm gối, máy lạnh Inverter, tủ lạnh, bếp từ.',
    },
    {
      id: 'R102',
      roomNumber: 'P.102',
      zoneId: 'Z001',
      floor: 1,
      price: 4500000,
      area: 28,
      maxTenants: 3,
      status: 'occupied',
      elecMeter: 980,
      waterMeter: 245,
      description: 'Phòng studio rộng rãi có gác lửng cao, tủ quần áo âm tường.',
    },
    {
      id: 'R103',
      roomNumber: 'P.103',
      zoneId: 'Z001',
      floor: 1,
      price: 3800000,
      area: 22,
      maxTenants: 2,
      status: 'vacant',
      elecMeter: 450,
      waterMeter: 110,
      description: 'Phòng thoáng mát, có cửa sổ lớn hướng Nam.',
    },
    {
      id: 'R201',
      roomNumber: 'P.201',
      zoneId: 'Z001',
      floor: 2,
      price: 5000000,
      area: 32,
      maxTenants: 3,
      status: 'maintenance',
      elecMeter: 1560,
      waterMeter: 410,
      description: 'Phòng VIP ban công rộng, view phố.',
    },
    {
      id: 'R202',
      roomNumber: 'P.202',
      zoneId: 'Z001',
      floor: 2,
      price: 4000000,
      area: 24,
      maxTenants: 2,
      status: 'deposit',
      elecMeter: 670,
      waterMeter: 180,
      description: 'Khách đã cọc giữ phòng 2.000.000đ, nhận phòng ngày 01/08/2026.',
    },
    {
      id: 'R-BT-1',
      roomNumber: 'P.301',
      zoneId: 'Z002',
      floor: 3,
      price: 3900000,
      area: 23,
      maxTenants: 2,
      status: 'occupied',
      elecMeter: 820,
      waterMeter: 195,
      description: 'Phòng Bình Thạnh thoáng tĩnh tĩnh lặng.',
    },
    {
      id: 'R-BT-2',
      roomNumber: 'P.302',
      zoneId: 'Z002',
      floor: 3,
      price: 4100000,
      area: 26,
      maxTenants: 2,
      status: 'vacant',
      elecMeter: 310,
      waterMeter: 85,
      description: 'Phòng mới sơn sửa lại cực đẹp.',
    }
  ],

  // 4. Danh sách Khách thuê
  tenants: [
    {
      id: 'T001',
      name: 'Nguyễn Văn Minh',
      phone: '0938111222',
      email: 'minh.nguyen@gmail.com',
      cccd: '079201008899',
      hometown: 'Long An',
      roomId: 'R101',
      zoneId: 'Z001',
      moveInDate: '2025-06-01',
      deposit: 4200000,
      contractId: 'HD001',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      cccdFrontUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
      cccdBackUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'T002',
      name: 'Lê Thị Thu Thảo',
      phone: '0977222333',
      email: 'thuthao.le@gmail.com',
      cccd: '038302001122',
      hometown: 'Đồng Nai',
      roomId: 'R102',
      zoneId: 'Z001',
      moveInDate: '2025-09-15',
      deposit: 4500000,
      contractId: 'HD002',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      cccdFrontUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
      cccdBackUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'T003',
      name: 'Phạm Đức Anh',
      phone: '0966444555',
      email: 'ducanh.pham@yahoo.com',
      cccd: '001200004455',
      hometown: 'Hà Nội',
      roomId: 'R-BT-1',
      zoneId: 'Z002',
      moveInDate: '2026-01-10',
      deposit: 3900000,
      contractId: 'HD003',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      cccdFrontUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
      cccdBackUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
    }
  ],

  // 5. Quản lý Hợp đồng
  contracts: [
    {
      id: 'HD001',
      contractCode: 'HD-2025-R101',
      roomId: 'R101',
      tenantId: 'T001',
      startDate: '2025-06-01',
      endDate: '2026-06-01',
      rentAmount: 4200000,
      deposit: 4200000,
      status: 'active', // active | expired | renew_requested | liquidated
      paymentTermDay: 5,
      terms: 'Bên B giữ vệ sinh chung, không nuôi thú cưng gây ồn, thanh toán tiền nhà trước ngày 05 hàng tháng.',
      fileUrl: 'hop-dong-phong-101.pdf',
    },
    {
      id: 'HD002',
      contractCode: 'HD-2025-R102',
      roomId: 'R102',
      tenantId: 'T002',
      startDate: '2025-09-15',
      endDate: '2026-09-15',
      rentAmount: 4500000,
      deposit: 4500000,
      status: 'active',
      paymentTermDay: 5,
      terms: 'Trả phòng báo trước 30 ngày. Không can thiệp sửa chữa kết cấu phòng khi chưa có sự đồng ý của bên A.',
      fileUrl: 'hop-dong-phong-102.pdf',
    },
    {
      id: 'HD003',
      contractCode: 'HD-2026-R301',
      roomId: 'R-BT-1',
      tenantId: 'T003',
      startDate: '2026-01-10',
      endDate: '2027-01-10',
      rentAmount: 3900000,
      deposit: 3900000,
      status: 'active',
      paymentTermDay: 5,
      terms: 'Giữ yên tĩnh sau 22h đêm. Thanh toán tiền điện nước đầy đủ hàng tháng.',
      fileUrl: 'hop-dong-phong-301.pdf',
    }
  ],

  // 6. Lịch sử Điện Nước
  utilityLogs: [
    {
      id: 'UTIL-0726-R101',
      roomId: 'R101',
      month: '2026-07',
      oldElec: 1140,
      newElec: 1240,
      elecUsed: 100,
      oldWater: 295,
      newWater: 310,
      waterUsed: 15,
      elecCost: 350000,
      waterCost: 270000,
      recordedAt: '2026-07-25',
    },
    {
      id: 'UTIL-0726-R102',
      roomId: 'R102',
      month: '2026-07',
      oldElec: 880,
      newElec: 980,
      elecUsed: 100,
      oldWater: 230,
      newWater: 245,
      waterUsed: 15,
      elecCost: 350000,
      waterCost: 270000,
      recordedAt: '2026-07-25',
    },
    {
      id: 'UTIL-0726-R301',
      roomId: 'R-BT-1',
      month: '2026-07',
      oldElec: 730,
      newElec: 820,
      elecUsed: 90,
      oldWater: 183,
      newWater: 195,
      waterUsed: 12,
      elecCost: 315000,
      waterCost: 216000,
      recordedAt: '2026-07-25',
    }
  ],

  // 7. Quản lý Dịch vụ
  services: [
    { id: 'S001', name: 'Internet / Wi-Fi Tốc độ cao', price: 100000, unit: 'phòng/tháng', icon: 'Wifi' },
    { id: 'S002', name: 'Giữ xe máy', price: 120000, unit: 'xe/tháng', icon: 'Bike' },
    { id: 'S003', name: 'Rác & Vệ sinh hành lang', price: 50000, unit: 'phòng/tháng', icon: 'Trash2' },
    { id: 'S004', name: 'Dùng Máy giặt chung', price: 80000, unit: 'người/tháng', icon: 'WashingMachine' },
    { id: 'S005', name: 'Phí Quản lý & An ninh', price: 60000, unit: 'phòng/tháng', icon: 'ShieldCheck' },
  ],

  // 8. Quản lý Hóa đơn
  invoices: [
    {
      id: 'INV-202607-101',
      invoiceCode: 'HD-0726-P101',
      roomId: 'R101',
      tenantId: 'T001',
      month: '2026-07',
      rentFee: 4200000,
      elecFee: 350000,
      waterFee: 270000,
      serviceFee: 270000, // Wifi + Rác + Xe
      totalAmount: 5090000,
      status: 'unpaid', // paid | unpaid | overdue
      dueDate: '2026-08-05',
      createdAt: '2026-07-26',
      items: [
        { name: 'Tiền thuê phòng P.101', amount: 4200000 },
        { name: 'Tiền điện (100 kWh x 3,500đ)', amount: 350000 },
        { name: 'Tiền nước (15 m³ x 18,000đ)', amount: 270000 },
        { name: 'Dịch vụ: Wi-Fi, Rác, Giữ xe', amount: 270000 },
      ]
    },
    {
      id: 'INV-202607-102',
      invoiceCode: 'HD-0726-P102',
      roomId: 'R102',
      tenantId: 'T002',
      month: '2026-07',
      rentFee: 4500000,
      elecFee: 350000,
      waterFee: 270000,
      serviceFee: 310000,
      totalAmount: 5430000,
      status: 'paid',
      paidDate: '2026-07-27',
      dueDate: '2026-08-05',
      createdAt: '2026-07-26',
      items: [
        { name: 'Tiền thuê phòng P.102', amount: 4500000 },
        { name: 'Tiền điện (100 kWh x 3,500đ)', amount: 350000 },
        { name: 'Tiền nước (15 m³ x 18,000đ)', amount: 270000 },
        { name: 'Dịch vụ tổng hợp', amount: 310000 },
      ]
    },
    {
      id: 'INV-202606-101',
      invoiceCode: 'HD-0626-P101',
      roomId: 'R101',
      tenantId: 'T001',
      month: '2026-06',
      rentFee: 4200000,
      elecFee: 380000,
      waterFee: 250000,
      serviceFee: 270000,
      totalAmount: 5100000,
      status: 'paid',
      paidDate: '2026-06-03',
      dueDate: '2026-06-05',
      createdAt: '2026-05-28',
      items: []
    }
  ],

  // 9. Lịch sử Thanh toán
  payments: [
    {
      id: 'PAY-001',
      invoiceId: 'INV-202607-102',
      amount: 5430000,
      method: 'VietQR', // VietQR | BankTransfer | Cash
      status: 'completed', // completed | pending_approval | rejected
      createdAt: '2026-07-27 09:30',
      proofImage: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=300&auto=format&fit=crop&q=80',
      note: 'Chuyển khoản VietQR thành công',
    }
  ],

  // 10. Quản lý Bảo trì (Repair Requests)
  maintenanceRequests: [
    {
      id: 'MT-001',
      roomId: 'R101',
      tenantId: 'T001',
      tenantName: 'Nguyễn Văn Minh',
      tenantPhone: '0938111222',
      issueType: 'Máy lạnh',
      title: 'Máy lạnh phòng P.101 không lạnh, có tiếng kêu nhỏ',
      description: 'Dàn lạnh thổi ra hơi gió nhưng không lạnh. Nhờ chủ trọ cho thợ kiểm tra giúp.',
      priority: 'High', // Low | Medium | High
      status: 'in_progress', // pending | in_progress | completed | cancelled
      assignedTo: 'Thợ điện lạnh Tuấn (0909112233)',
      createdAt: '2026-07-27 10:15',
      imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&auto=format&fit=crop&q=80',
    },
    {
      id: 'MT-002',
      roomId: 'R-BT-1',
      tenantId: 'T003',
      tenantName: 'Phạm Đức Anh',
      tenantPhone: '0966444555',
      issueType: 'Vòi nước',
      title: 'Bồn rửa chén bị rò rỉ nước',
      description: 'Vòi củ sen ở nhà vệ sinh bị rỉ giọt nước liên tục.',
      priority: 'Medium',
      status: 'pending',
      assignedTo: 'Chưa phân công',
      createdAt: '2026-07-28 08:20',
      imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80',
    }
  ],

  // 11. Thông báo (Notifications)
  notifications: [
    {
      id: 'N001',
      title: 'Thông báo lịch thu tiền nhà & điện nước tháng 08/2026',
      content: 'Kính gửi quý khách thuê, hệ thống đã phát hành hóa đơn tiền nhà tháng 07/2026. Vui lòng thanh toán trước ngày 05/08/2026 qua chuyển khoản VietQR hoặc tiền mặt.',
      target: 'all_tenants',
      targetName: 'Tất cả khách thuê',
      sender: 'Chủ trọ Nguyễn Văn Hải',
      createdAt: '2026-07-26 14:00',
      isRead: false,
    },
    {
      id: 'N002',
      title: 'Bảo trì bảo dưỡng hệ thống Thang máy & PCCC',
      content: 'Khu trọ SmartRent Q1 sẽ thực hiện bảo trì thang máy vào sáng Chủ Nhật 02/08/2026 từ 08:00 đến 11:00. Quý khách vui lòng đi thang bộ trong thời gian trên.',
      target: 'Z001',
      targetName: 'Khu Trọ SmartRent Q1',
      sender: 'Chủ trọ Nguyễn Văn Hải',
      createdAt: '2026-07-25 09:00',
      isRead: true,
    },
    {
      id: 'N003',
      title: 'Cập nhật tính năng nâng cấp bảo mật hệ thống SmartRent 2.0',
      content: 'Ban quản trị hệ thống vừa phát hành phiên bản mới bổ sung mã QR VietQR động và xuất file hóa đơn PDF.',
      target: 'all_landlords',
      targetName: 'Tất cả Chủ trọ',
      sender: 'Super Admin System',
      createdAt: '2026-07-24 16:30',
      isRead: true,
    }
  ],

  // 12. Phản hồi & Khiếu nại (Gửi cho Super Admin)
  complaints: [
    {
      id: 'FB-001',
      senderName: 'Trần Thị Mai',
      role: 'Chủ trọ',
      email: 'maitran@gmail.com',
      title: 'Góp ý thêm tính năng xuất báo cáo thu chi dạng file Excel nâng cao',
      content: 'Nhờ AD hỗ trợ thêm tùy chọn lọc theo khoảng ngày cụ thể khi xuất file Excel báo cáo doanh thu.',
      status: 'resolved',
      reply: 'Đã cập nhật tính năng xuất Excel tùy chỉnh trong phiên bản mới!',
      createdAt: '2026-07-20 11:00',
    },
    {
      id: 'FB-002',
      senderName: 'Nguyễn Văn Minh',
      role: 'Người thuê',
      email: 'minh.nguyen@gmail.com',
      title: 'Đề xuất nâng cấp đường truyền Wi-Fi tầng 1',
      content: 'Mong ban quản trị trao đổi với chủ trọ tăng băng thông mạng internet vào buổi tối.',
      status: 'pending',
      reply: '',
      createdAt: '2026-07-27 15:20',
    }
  ]
};
