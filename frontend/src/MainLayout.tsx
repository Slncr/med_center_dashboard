import React from 'react';
import AdminHeader from './components/common/AdminHeader';
import './MainLayout.css';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="ml-container">
      {/* ✅ Хедер присутствует на ВСЕХ страницах, но виден только админу */}
      <AdminHeader />
      
      <main className="ml-main-content">
        {children}
      </main>
      
      {/* <footer className="ml-footer">
        <div className="ml-footer-content">
          <p>© {new Date().getFullYear()} Медицинский центр</p>
          <p className="ml-version">Версия 1.2</p>
        </div>
      </footer> */}
    </div>
  );
};

export default MainLayout;