import React, { useState } from 'react';
import { LogIn, Mail, Lock, Chrome } from 'lucide-react';
import { loginComGoogle, loginComEmail, registrarComEmail } from './firebase';

const LoginScreen = ({ onLoginSuccess }) => {
  const [modo, setModo] = useState('login'); // 'login' ou 'registro'
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleGoogleLogin = async () => {
    setCarregando(true);
    setErro('');
    try {
      const user = await loginComGoogle();
      // O onAuthStateChanged no App.tsx detectará a mudança automaticamente
      // Não precisamos chamar onLoginSuccess manualmente
    } catch (error) {
      console.error('Erro no login Google:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErro('Login cancelado. Tente novamente.');
      } else if (error.code === 'auth/popup-blocked') {
        setErro('Popup bloqueado. Permita popups e tente novamente.');
      } else {
        setErro('Erro ao fazer login com Google. Tente novamente.');
      }
      setCarregando(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !senha) {
      setErro('Preencha todos os campos');
      return;
    }

    setCarregando(true);
    setErro('');
    try {
      if (modo === 'login') {
        const user = await loginComEmail(email, senha);
        onLoginSuccess(user);
      } else {
        const user = await registrarComEmail(email, senha);
        onLoginSuccess(user);
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setErro('Usuário não encontrado');
      } else if (error.code === 'auth/wrong-password') {
        setErro('Senha incorreta');
      } else if (error.code === 'auth/email-already-in-use') {
        setErro('Email já cadastrado');
      } else if (error.code === 'auth/weak-password') {
        setErro('Senha muito fraca (mín. 6 caracteres)');
      } else {
        setErro('Erro ao autenticar. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-4">
      {/* Background animado */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Card de Login */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4">
            <LogIn className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FinanceFlow</h1>
          <p className="text-gray-600">Gestão Financeira Profissional</p>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm text-center">{erro}</p>
          </div>
        )}

        {/* Botão Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={carregando}
          className="w-full mb-6 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 font-medium text-gray-700 disabled:opacity-50"
        >
          <Chrome size={20} />
          Continuar com Google
        </button>

        {/* Divisor */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">ou</span>
          </div>
        </div>

        {/* Formulário Email/Senha */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={carregando}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={carregando}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando ? 'Carregando...' : modo === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        {/* Toggle Login/Registro */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setModo(modo === 'login' ? 'registro' : 'login');
              setErro('');
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {modo === 'login' ? 'Não tem conta? Criar agora' : 'Já tem conta? Fazer login'}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          Seus dados são criptografados e armazenados com segurança
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
