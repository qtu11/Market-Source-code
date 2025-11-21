"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from 'lucide-react';

interface WithdrawmoneyProps {
  pendingWithdrawals: any[];
  processingWithdrawal: string | null;
  approveWithdrawal: (withdrawalId: string) => void;
  rejectWithdrawal: (withdrawalId: string) => void;
  loadData: () => void;
}

export function Withdrawmoney({
  pendingWithdrawals,
  processingWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  loadData
}: WithdrawmoneyProps) {
  return (
    <div className="space-y-6">
      <Card className="shadow-md bg-white/60 dark:bg-gray-800/60">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              Yêu cầu rút tiền ({pendingWithdrawals.filter(w => w.status !== "rejected").length})
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-muted-foreground">Real-time</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData}
              className="ml-4"
            >
              Làm mới
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingWithdrawals
              .filter(w => w.status !== "rejected")
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((withdrawal) => (
              <div key={withdrawal.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold">{withdrawal.userName || 'Unknown User'}</h3>
                      {withdrawal.status === "pending" && (
                        <Badge className="bg-red-500 text-white animate-pulse shadow-md">Mới</Badge>
                      )}
                      {withdrawal.userStatus && (
                        <Badge className={
                          withdrawal.userStatus === "active" ? "bg-green-500 text-white shadow-md" : 
                          "bg-red-500 text-white shadow-md"
                        }>
                          {withdrawal.userStatus === "active" ? "Hoạt động" : "Khóa"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{withdrawal.userEmail}</p>
                    
                    {/* Enhanced User Balance Info */}
                    <div className="mb-3 p-2 bg-red-100 dark:bg-red-900 rounded border-l-4 border-red-500 shadow-inner">
                      <p className="text-xs text-blue-600">
                        💰 Số dư hiện tại: {(withdrawal.userBalance || 0).toLocaleString('vi-VN')}đ
                      </p>
                      <p className="text-xs text-red-600">
                        ➖ Sau rút: {Math.max(0, (withdrawal.userBalance || 0) - withdrawal.amount).toLocaleString('vi-VN')}đ
                      </p>
                      {(withdrawal.userBalance || 0) < withdrawal.amount && (
                        <p className="text-xs text-red-800 font-semibold bg-red-100 dark:bg-red-800 p-1 rounded mt-1">
                          ⚠️ KHÔNG ĐỦ SỐ DƯ!
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-1 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm">
                        <strong>🏦 Ngân hàng:</strong> {withdrawal.bankInfo?.name || withdrawal.method}
                      </p>
                      <p className="text-sm">
                        <strong>📋 STK/SĐT:</strong> {withdrawal.bankInfo?.accountNumber || 'N/A'}
                      </p>
                      <p className="text-sm">
                        <strong>👤 Tên TK:</strong> {withdrawal.bankInfo?.accountName || 'N/A'}
                      </p>
                      <p className="text-xs text-blue-600">
                        🌐 IP: {withdrawal.ipAddress || 'Unknown'}
                      </p>
                      <p className="text-xs text-blue-600">
                        📱 Thiết bị: {withdrawal.deviceInfo?.deviceType || 'Unknown'} ({withdrawal.deviceInfo?.browser || 'Unknown'})
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">
                        🕐 Thời gian: {withdrawal.requestTimeFormatted || withdrawal.timestamp}
                      </p>
                      {withdrawal.note && (
                        <p className="text-xs text-gray-700 bg-gray-100 dark:bg-gray-700 p-2 rounded mt-1 shadow-sm">
                          📝 Ghi chú: {withdrawal.note}
                        </p>
                      )}
                      {withdrawal.processed && (
                        <div className="text-xs text-green-700 bg-green-50 dark:bg-green-900 p-2 rounded mt-1 shadow-sm">
                          ✅ Đã xử lý bởi: {withdrawal.approvedBy} lúc {new Date(withdrawal.approvedTime).toLocaleString('vi-VN')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        -{withdrawal.amount.toLocaleString('vi-VN')}đ
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Nhận: {(withdrawal.amount || withdrawal.totalDeduct || withdrawal.amount).toLocaleString('vi-VN')}đ
                      </p>
                      <Badge className={
                        withdrawal.status === "pending" ? "bg-yellow-500 text-white shadow-md" :
                        withdrawal.status === "approved" ? "bg-green-500 text-white shadow-md" :
                        "bg-red-500 text-white shadow-md"
                      }>
                        {withdrawal.status === "pending" ? "Chờ duyệt" :
                         withdrawal.status === "approved" ? "Đã duyệt" : "Từ chối"}
                      </Badge>
                    </div>
                    {withdrawal.status === "pending" && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => approveWithdrawal(withdrawal.id.toString())}
                          disabled={processingWithdrawal === withdrawal.id.toString()}
                          className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                        >
                          {processingWithdrawal === withdrawal.id.toString() ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectWithdrawal(withdrawal.id.toString())}
                          className="text-red-600 hover:text-red-700 border-red-500"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          {pendingWithdrawals.filter(w => w.status !== "rejected").length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Không có yêu cầu rút tiền nào
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  </div>
)
}
