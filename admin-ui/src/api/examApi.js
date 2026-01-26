import axiosClient from "./axiosClient";

// ============================================
// EXAM ATTEMPTS APIs
// ============================================

/**
 * Lấy danh sách tất cả exam attempts của user hiện tại
 * Dùng cho màn hình UserReview - Đánh giá học tập
 * @returns {Promise} Promise với data là array của UserExamAttemptDTO
 */
export const getMyExamAttemptsApi = async () => {
    const url = "/exam-attempts/my-attempts";
    return axiosClient.get(url);
};

/**
 * Lấy chi tiết một exam attempt cụ thể
 * @param {number} attemptId - ID của exam attempt
 * @returns {Promise} Promise với data là chi tiết exam attempt
 */
export const getExamAttemptByIdApi = async (attemptId) => {
    const url = `/exam-attempts/${attemptId}`;
    return axiosClient.get(url);
};

/**
 * Bắt đầu một bài thi mới
 * @param {number} examId - ID của exam cần bắt đầu
 * @returns {Promise} Promise với data là thông tin attempt mới tạo
 */
export const startExamAttemptApi = async (examId) => {
    const url = "/exam-attempts/start";
    return axiosClient.post(url, { examId });
};

/**
 * Submit bài thi
 * @param {number} attemptId - ID của exam attempt
 * @param {Array} answers - Mảng các câu trả lời
 * @returns {Promise} Promise với data là kết quả submit
 */
export const submitExamAttemptApi = async (attemptId, answers) => {
    const url = `/exam-attempts/${attemptId}/submit`;
    return axiosClient.post(url, { answers });
};

/**
 * Lấy thống kê exam attempts của user
 * @returns {Promise} Promise với data là các thống kê
 */
export const getExamAttemptsStatsApi = async () => {
    const url = "/exam-attempts/stats";
    return axiosClient.get(url);
};