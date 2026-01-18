import React, { useState } from 'react';


import { NavLink } from 'react-router-dom';


import Logo from './Logo';


import { useUserContext } from '../../context/UserContext';


import { HamburgerIcon } from '../Icons';


import MobileNavMenu from './MobileNavMenu';


import { NAV_LINKS } from '../../data/navigation';


import Search from './Search';


import ThemeToggle from '../ThemeToggle';
import CategoryMenu from "@/components/nav/CategoryMenu";





const Header: React.FC = () => {


  const { openProfileModal } = useUserContext();


  const [isMenuOpen, setIsMenuOpen] = useState(false);





  const navLinkClass = ({ isActive }: { isActive: boolean }) =>


    `py-2 px-3 rounded-md text-sm font-medium transition-colors ${isActive ? 'text-accent font-bold' : 'text-text-primary'}`;





  return (


    <>


      <header className="sticky top-0 z-30 bg-background border-b border-border-color print:hidden shadow-sm">


        <div className="container mx-auto px-4 mx-auto flex justify-between items-center p-3">


          <Logo />


          <div className="flex items-center gap-3"><CategoryMenu /></div>


          <div className="flex items-center gap-4">


            <Search />


            <div className="hidden md:flex items-center gap-4">


              <ThemeToggle />


              <button


                onClick={openProfileModal}


                className="btn btn-secondary text-sm px-4 py-2"


              >


                Profile


              </button>


            </div>


            <div className="md:hidden">


              <button


                onClick={() => setIsMenuOpen(true)}


                className="p-2 rounded-md hover:bg-border-color"


                aria-label="Open navigation menu"


              >


                <HamburgerIcon className="h-6 w-6 text-text-primary" />


              </button>


            </div>


          </div>


        </div>


      </header>


      <MobileNavMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />


    </>


  );


};





export default Header;


