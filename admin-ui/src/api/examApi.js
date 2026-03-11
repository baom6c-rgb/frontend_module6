import axiosClient from "./axiosClient";

// ============================================
// EXAM ATTEMPTS APIs
// ============================================

/**
 * Lấy danh sách tất cả exam attempts của user hiện tại
 * Backend tự động extract userId từ JWT token
 * @returns {Promise} Promise với data là array của UserExamAttemptDTO
 */
export const getMyExamAttemptsApi = async () => {
    try {
        console.log("📡 API Call: getMyExamAttemptsApi");
        const url = "/exam-attempts/my-attempts";
        const response = await axiosClient.get(url);
        console.log("✅ API Response:", response.status, response.data);
        return response;
    } catch (error) {
        console.error("❌ getMyExamAttemptsApi error:", error);
        throw error;
    }
};

/**
 * Lấy chi tiết một exam attempt cụ thể
 * @param {number} attemptId - ID của exam attempt
 * @returns {Promise} Promise với data là chi tiết exam attempt
 */
export const getExamAttemptByIdApi = async (attemptId) => {
    try {
        console.log("📡 API Call: getExamAttemptByIdApi, attemptId:", attemptId);
        const url = `/exam-attempts/${attemptId}`;
        const response = await axiosClient.get(url);
        console.log("✅ API Response:", response.status, response.data);
        return response;
    } catch (error) {
        console.error("❌ getExamAttemptByIdApi error:", error);
        throw error;
    }
};

/**
 * Bắt đầu một bài thi mới
 * @param {number} examId - ID của exam cần bắt đầu
 * @returns {Promise} Promise với data là thông tin attempt mới tạo
 */
export const startExamAttemptApi = async (examId) => {
    try {
        console.log("📡 API Call: startExamAttemptApi, examId:", examId);
        const url = "/exam-attempts/start";
        const response = await axiosClient.post(url, { examId });
        console.log("✅ API Response:", response.status, response.data);
        return response;
    } catch (error) {
        console.error("❌ startExamAttemptApi error:", error);
        throw error;
    }
};

/**
 * Submit bài thi
 * @param {number} attemptId - ID của exam attempt
 * @param {Array} answers - Mảng các câu trả lời
 * @returns {Promise} Promise với data là kết quả submit
 */
export const submitExamAttemptApi = async (attemptId, answers) => {
    try {
        console.log("📡 API Call: submitExamAttemptApi");
        console.log("   attemptId:", attemptId);
        console.log("   answers:", answers);
        const url = `/exam-attempts/${attemptId}/submit`;
        const response = await axiosClient.post(url, { answers });
        console.log("✅ API Response:", response.status, response.data);
        return response;
    } catch (error) {
        console.error("❌ submitExamAttemptApi error:", error);
        throw error;
    }
};

/**
 * Lấy thống kê exam attempts của user
 * Backend tự động extract userId từ JWT token
 * @returns {Promise} Promise với data là các thống kê
 */
export const getExamAttemptsStatsApi = async () => {
    try {
        console.log("📡 API Call: getExamAttemptsStatsApi");
        const url = "/exam-attempts/stats";
        const response = await axiosClient.get(url);
        console.log("✅ API Response:", response.status, response.data);
        return response;
    } catch (error) {
        console.error("❌ getExamAttemptsStatsApi error:", error);
        throw error;
    }
};