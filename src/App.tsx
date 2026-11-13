import { useEffect, useState } from 'react';
import { authService, type HospitalConfig, type PingResponse } from './services/authService';
import { type AccountResponse, type CsrfResponse, ApiError } from './services/api';
import './App.css';


interface ConnectionStatus {
  ping: { loading: boolean; data: PingResponse | null; error: string | null };
  csrf: { loading: boolean; data: CsrfResponse | null; error: string | null };
  config: { loading: boolean; data: HospitalConfig | null; error: string | null };
  currentUser: { loading: boolean; data: AccountResponse | null; error: string | null };
}

export function App() {
  const [status, setStatus] = useState<ConnectionStatus>({
    ping: { loading: true, data: null, error: null },
    csrf: { loading: true, data: null, error: null },
    config: { loading: true, data: null, error: null },
    currentUser: { loading: false, data: null, error: null },
  });

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Htac@2026');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setStatus((prev) => ({
      ...prev,
      ping: { loading: true, data: null, error: null },
      csrf: { loading: true, data: null, error: null },
      config: { loading: true, data: null, error: null },
    }));

    // 1. Kiểm tra Liveness (Ping)
    try {
      const pingData = await authService.ping();
      setStatus((prev) => ({ ...prev, ping: { loading: false, data: pingData, error: null } }));
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        ping: {
          loading: false,
          data: null,
          error: err instanceof Error ? err.message : 'Không thể kết nối proxy /api sang backend',
        },
      }));
    }

    // 2. Lấy CSRF token
    try {
      const csrfData = await authService.getCsrf();
      setStatus((prev) => ({ ...prev, csrf: { loading: false, data: csrfData, error: null } }));
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        csrf: {
          loading: false,
          data: null,
          error: err instanceof Error ? err.message : 'Lỗi lấy CSRF token',
        },
      }));
    }

    // 3. Lấy cấu hình Bệnh viện
    try {
      const configData = await authService.getHospitalConfig();
      setStatus((prev) => ({ ...prev, config: { loading: false, data: configData, error: null } }));
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        config: {
          loading: false,
          data: null,
          error: err instanceof Error ? err.message : 'Không tải được dữ liệu bệnh viện',
        },
      }));
    }

    // 4. Kiểm tra phiên đăng nhập hiện tại
    try {
      const currentUser = await authService.getCurrentUser();
      setStatus((prev) => ({
        ...prev,
        currentUser: { loading: false, data: currentUser, error: null },
      }));
    } catch {
      setStatus((prev) => ({
        ...prev,
        currentUser: { loading: false, data: null, error: null },
      }));
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const user = await authService.login({ username, password });
      setStatus((prev) => ({
        ...prev,
        currentUser: { loading: false, data: user, error: null },
      }));
    } catch (err) {
      if (err instanceof ApiError) {
        setLoginError(`[${err.code}] ${err.message}`);
      } else {
        setLoginError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setStatus((prev) => ({
        ...prev,
        currentUser: { loading: false, data: null, error: null },
      }));
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    }
  };

  const isConnected = status.ping.data?.status === 'UP';

  return (
    <div className="container">
      <header className="header">
        <div className="badge">HTAC Hospital Information System</div>
        <h1>Kiểm tra kết nối Frontend ↔ Backend</h1>
        <p className="subtitle">
          Vite Proxy: <code>/api</code> ➔ <code>http://localhost:8080</code> | Session Cookie &amp; CSRF
        </p>
      </header>

      {/* Thanh trạng thái tổng quát */}
      <div className={`status-banner ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
        <div className="status-indicator">
          <span className="dot"></span>
          <strong>Trạng thái Backend: {isConnected ? 'ĐÃ KẾT NỐI (ONLINE)' : 'CHƯA KẾT NỐI (OFFLINE)'}</strong>
        </div>
        <button onClick={runDiagnostics} className="btn-secondary">
          Kiểm tra lại
        </button>
      </div>

      {!isConnected && (
        <div className="alert-box">
          <h3>Hướng dẫn khởi động Backend</h3>
          <p>Nếu Backend chưa chạy trên cổng 8080, hãy mở terminal tại <code>D:\HIS\backend_his</code> và chạy:</p>
          <pre>mvn -DskipTests package && java -jar target\htac-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=local</pre>
        </div>
      )}

      {/* 3 Thẻ kiểm tra dịch vụ */}
      <div className="cards-grid">
        {/* Card 1: Ping */}
        <div className="card">
          <div className="card-header">
            <h3>1. Liveness Probe</h3>
            <span className="tag">GET /api/v1/public/ping</span>
          </div>
          {status.ping.loading ? (
            <p className="loading">Đang kiểm tra...</p>
          ) : status.ping.error ? (
            <p className="error-text">❌ {status.ping.error}</p>
          ) : (
            <div className="card-content success-box">
              <p><strong>Phản hồi:</strong> <code>{JSON.stringify(status.ping.data)}</code></p>
              <p className="desc">Proxy Vite chuyển tiếp thành công tới Spring Boot.</p>
            </div>
          )}
        </div>

        {/* Card 2: CSRF */}
        <div className="card">
          <div className="card-header">
            <h3>2. Bảo mật CSRF</h3>
            <span className="tag">GET /api/v1/public/csrf</span>
          </div>
          {status.csrf.loading ? (
            <p className="loading">Đang tải token...</p>
          ) : status.csrf.error ? (
            <p className="error-text">❌ {status.csrf.error}</p>
          ) : (
            <div className="card-content success-box">
              <p><strong>Header:</strong> <code>{status.csrf.data?.headerName}</code></p>
              <p><strong>Token:</strong> <code>{status.csrf.data?.token.substring(0, 16)}...</code></p>
              <p className="desc">Phiên session và CSRF token đã sẵn sàng cho POST/PUT/DELETE.</p>
            </div>
          )}
        </div>

        {/* Card 3: Cấu hình bệnh viện */}
        <div className="card">
          <div className="card-header">
            <h3>3. Cấu hình cơ sở y tế</h3>
            <span className="tag">GET /api/v1/public/hospital-config</span>
          </div>
          {status.config.loading ? (
            <p className="loading">Đang truy vấn database...</p>
          ) : status.config.error ? (
            <p className="error-text">❌ {status.config.error}</p>
          ) : (
            <div className="card-content success-box">
              <p><strong>Bệnh viện:</strong> {status.config.data?.name}</p>
              <p><strong>Hotline:</strong> {status.config.data?.phone}</p>
              <p><strong>Địa chỉ:</strong> {status.config.data?.address}</p>
              <p><strong>Số ngày đặt trước:</strong> {status.config.data?.advanceBookingDays} ngày</p>
            </div>
          )}
        </div>
      </div>

      {/* Thử nghiệm Đăng nhập / Phiên người dùng */}
      <section className="auth-section">
        <div className="card auth-card">
          <div className="card-header">
            <h2>4. Kiểm tra Phiên đăng nhập (Session &amp; Phân quyền)</h2>
            <span className="tag">POST /api/v1/public/auth/login</span>
          </div>

          {status.currentUser.data ? (
            <div className="user-profile-box">
              <div className="profile-header">
                <div>
                  <h3>Xin chào, {status.currentUser.data.fullName}!</h3>
                  <p className="user-role-badge">Vai trò: <strong>{status.currentUser.data.role}</strong></p>
                </div>
                <button onClick={handleLogout} className="btn-danger">
                  Đăng xuất
                </button>
              </div>
              <div className="profile-details">
                <p><strong>Username:</strong> {status.currentUser.data.username}</p>
                <p><strong>User ID:</strong> {status.currentUser.data.id}</p>
                <p><strong>Số điện thoại:</strong> {status.currentUser.data.phone}</p>
              </div>
              <p className="auth-success-hint">
                Cookie <code>JSESSIONID</code> đã được trình duyệt lưu tự động. Các request sau sẽ có quyền của vai trò này.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="login-form">
              <p className="form-desc">
                Thử đăng nhập bằng tài khoản mẫu trong cơ sở dữ liệu (ví dụ tài khoản ADMIN hoặc bác sĩ từ seed data).
              </p>
              {loginError && <div className="error-banner">{loginError}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">Tên đăng nhập:</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Mật khẩu:</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loginLoading} className="btn-primary">
                {loginLoading ? 'Đang xác thực...' : 'Đăng nhập thử nghiệm'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
