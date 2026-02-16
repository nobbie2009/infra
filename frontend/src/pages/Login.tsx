import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!username || !password) {
      setFormError('Username and password are required');
      return;
    }

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setFormError(message);
    }
  };

  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-4">
      <div className="card-terminal w-full max-w-md shadow-terminal-glow-strong">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-terminal-primary text-glow-strong section-header">LOGIN</h1>
          <p className="text-terminal-muted mt-2 font-mono">authenticate to continue</p>
        </div>

        {error && (
          <div className="mb-4 p-4 border border-terminal-danger text-terminal-danger rounded">
            <span className="font-mono">[ERROR]</span> {error}
          </div>
        )}

        {formError && (
          <div className="mb-4 p-4 border border-terminal-warning text-terminal-warning rounded">
            <span className="font-mono">[WARN]</span> {formError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-terminal-primary font-mono font-medium mb-2">[ USERNAME ]</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-terminal"
              placeholder=">_ username"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-terminal-primary font-mono font-medium mb-2">[ PASSWORD ]</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-terminal"
              placeholder=">_ password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-terminal w-full font-mono uppercase"
          >
            {loading ? '[ AUTHENTICATING... ]' : '[ AUTHENTICATE ]'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-terminal-border">
          <p className="text-center text-terminal-muted text-sm font-mono">
            INFRA-MANAGER v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
