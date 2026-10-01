// components/dashboard/fees/FeeCollection.tsx
'use client';

import { useState, useEffect } from 'react';
import { FaSearch, FaMoneyBill, FaUserGraduate, FaCalendarAlt, FaReceipt, FaPlus, FaPrint } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface PaymentRecord {
  transaction_id: string;
  student_id: string;
  amount: number;
  mode: string;
  payment_date?: string;
  student_name?: string;
  class_name?: string;
  section?: string;
  fee_type?: string;
}

interface FeeCollectionProps {
  academicYear: string;
}

export default function FeeCollection({ academicYear }: FeeCollectionProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [feeTypes, setFeeTypes] = useState<string[]>(['Tuition', 'Transport', 'Hostel', 'Library']);
  const [paymentModes, setPaymentModes] = useState(['UPI', 'Cash', 'Card', 'NetBanking', 'Cheque']);

  const [collectionForm, setCollectionForm] = useState({
    student_id: '',
    class_name: '',
    fee_type: 'Tuition',
    paid_amount: '',
    payment_mode: 'UPI',
    transaction_id: '',
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    fetchPaymentRecords(today);
    fetchClasses();
  }, [academicYear]);

  const fetchPaymentRecords = async (date: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/fees/report/daily/?date=${date}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data.transactions || []);
      } else {
        toast.error('Failed to fetch payment records');
      }
    } catch (error) {
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://senthurvidyalaya-backend.onrender.com/api/academics/standards/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.map((cls: any) => cls.name));
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleCollectFee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      // Validate transaction ID uniqueness
      const isDuplicate = payments.some(p => p.transaction_id === collectionForm.transaction_id);
      if (isDuplicate) {
        toast.error('Transaction ID already exists');
        return;
      }

      const payload = {
        student_id: collectionForm.student_id,
        class_name: collectionForm.class_name,
        fee_type: collectionForm.fee_type,
        paid_amount: parseFloat(collectionForm.paid_amount),
        payment_mode: collectionForm.payment_mode,
        transaction_id: collectionForm.transaction_id,
      };

      const response = await fetch('https://senthurvidyalaya-backend.onrender.com/api/fees/pay/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Fee collected successfully!');
        setShowCollectionModal(false);
        setCollectionForm({
          student_id: '',
          class_name: '',
          fee_type: 'Tuition',
          paid_amount: '',
          payment_mode: 'UPI',
          transaction_id: '',
        });
        fetchPaymentRecords(selectedDate);
        
        // Show receipt
        handlePrintReceipt(data.transaction_id || collectionForm.transaction_id);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Collection failed');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };

  const handlePrintReceipt = async (transactionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/fees/receipt/?transaction_id=${transactionId}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const receipt = await response.json();
        // Open receipt in new window for printing
        const receiptWindow = window.open('', '_blank');
        if (receiptWindow) {
          receiptWindow.document.write(`
            <html>
              <head>
                <title>Receipt - ${transactionId}</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 20px; }
                  .receipt { border: 1px solid #ccc; padding: 20px; max-width: 500px; margin: 0 auto; }
                  .header { text-align: center; margin-bottom: 20px; }
                  .details { margin-bottom: 20px; }
                  .detail-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                  .total { font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
                </style>
              </head>
              <body>
                <div class="receipt">
                  <div class="header">
                    <h2>FEE PAYMENT RECEIPT</h2>
                    <p>Transaction ID: ${receipt.receipt?.transaction_id || transactionId}</p>
                  </div>
                  <div class="details">
                    <div class="detail-row">
                      <span>Student Name:</span>
                      <span>${receipt.receipt?.student_name || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                      <span>Student ID:</span>
                      <span>${receipt.receipt?.student_id || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                      <span>Fee Type:</span>
                      <span>${receipt.receipt?.fee_type || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                      <span>Amount Paid:</span>
                      <span>₹${receipt.receipt?.amount_paid || collectionForm.paid_amount}</span>
                    </div>
                    <div class="detail-row">
                      <span>Payment Mode:</span>
                      <span>${receipt.receipt?.payment_mode || collectionForm.payment_mode}</span>
                    </div>
                    <div class="detail-row">
                      <span>Date:</span>
                      <span>${new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div class="total">
                    <div class="detail-row">
                      <span>TOTAL PAID:</span>
                      <span>₹${receipt.receipt?.amount_paid || collectionForm.paid_amount}</span>
                    </div>
                  </div>
                </div>
                <script>window.print();</script>
              </body>
            </html>
          `);
          receiptWindow.document.close();
        }
      }
    } catch (error) {
      toast.error('Failed to generate receipt');
    }
  };

  const filteredPayments = payments.filter(payment =>
    payment.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCollection = payments.reduce((sum:any, payment) => sum + payment.amount, );

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Fee Collection</h2>
          <p className="text-gray-600">Record and manage fee payments</p>
        </div>
        
        <button
          onClick={() => setShowCollectionModal(true)}
          className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FaPlus />
          <span>Collect Fee</span>
        </button>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  fetchPaymentRecords(e.target.value);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Student ID or Transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">Daily Collection</h3>
            <p className="text-blue-100">For {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">₹{totalCollection.toLocaleString()}</p>
            <p className="text-blue-100">{payments.length} transactions</p>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Transaction ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount (₹)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Mode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No payment records found for {selectedDate}
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr key={payment.transaction_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaReceipt className="text-gray-400 mr-2" />
                      <span className="font-mono text-sm">{payment.transaction_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium">{payment.student_id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-green-600">₹{payment.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      payment.mode === 'UPI' ? 'bg-purple-100 text-purple-800' :
                      payment.mode === 'Cash' ? 'bg-green-100 text-green-800' :
                      payment.mode === 'Card' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {payment.mode}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaCalendarAlt className="text-gray-400 mr-2" />
                      <span>{payment.payment_date || selectedDate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handlePrintReceipt(payment.transaction_id)}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50"
                      title="Print Receipt"
                    >
                      <FaPrint />
                      <span>Receipt</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Collect Fee Payment</h3>
                <button
                  onClick={() => setShowCollectionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCollectFee}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student ID
                      </label>
                      <input
                        type="text"
                        value={collectionForm.student_id}
                        onChange={(e) => setCollectionForm({ ...collectionForm, student_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter Student ID"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Class
                      </label>
                      <select
                        value={collectionForm.class_name}
                        onChange={(e) => setCollectionForm({ ...collectionForm, class_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select Class</option>
                        {classes.map((cls) => (
                          <option key={cls} value={cls}>Class {cls}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fee Type
                      </label>
                      <select
                        value={collectionForm.fee_type}
                        onChange={(e) => setCollectionForm({ ...collectionForm, fee_type: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {feeTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={collectionForm.paid_amount}
                        onChange={(e) => setCollectionForm({ ...collectionForm, paid_amount: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter amount"
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Mode
                      </label>
                      <select
                        value={collectionForm.payment_mode}
                        onChange={(e) => setCollectionForm({ ...collectionForm, payment_mode: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {paymentModes.map((mode) => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transaction ID
                      </label>
                      <input
                        type="text"
                        value={collectionForm.transaction_id}
                        onChange={(e) => setCollectionForm({ ...collectionForm, transaction_id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter Txn ID"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowCollectionModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Collect Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}