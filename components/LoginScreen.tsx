import React, { useState } from 'react';
import { WalletCards, ArrowRight, Lock, User as UserIcon, Mail } from 'lucide-react';
import { User } from '../types';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '../constants';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; 

const LoginScreen: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Preencha todos os campos.');
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        if (!name) {
          setError('Nome é obrigatório.');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        const newUser: Omit<User, 'id'> = {
          name,
          username: email.split('@')[0], // Simple username generation
          email,
          accounts: DEFAULT_ACCOUNTS,
          categories: DEFAULT_CATEGORIES,
        };
        
        await setDoc(doc(db, "users", firebaseUser.uid), newUser);

      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Email ou senha incorretos.');
      } else {
        setError('Ocorreu um erro. Tente novamente.');
      }
      console.error("Firebase Auth Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-emerald-600 p-3 rounded-xl mb-4 shadow-lg shadow-emerald-200">
            <WalletCards className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Meu DinDin</h1>
          <p className="text-slate-500 text-center mt-2">
            {isRegistering ? 'Crie sua conta para começar.' : 'Faça login para acessar suas finanças.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
              <div className="relative"> <UserIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" /> <input type="text" required className="w-full pl-10 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} /> </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <div className="relative"> <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" /> <input type="email" required className="w-full pl-10 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /> </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <div className="relative"> <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" /> <input type="password" required className="w-full pl-10 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="******" value={password} onChange={(e) => setPassword(e.target.value)} /> </div>
          </div>
          {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-medium py-3 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Entrar')} {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <button onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-sm text-emerald-600 font-semibold hover:underline">
            {isRegistering ? 'Já tenho uma conta. Fazer login.' : 'Não tem conta? Crie uma agora.'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;