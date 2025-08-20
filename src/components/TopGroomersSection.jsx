import React from 'react';
import Groomer1 from '../assets/images/groomer-1.png';
import Groomer2 from '../assets/images/groomer-2.png';
import Groomer3 from '../assets/images/groomer-3.png';
import CustomButton from './CustomButton';

const TopGroomersSection = () => {
  return (
    <section className="bg-[#F5F5F5] py-12 pt-[6em]">
      <div className="container mx-auto flex flex-col items-center">
        <h2 className="text-blue-500 text-2xl font-bold mb-2 md:text-2xl md:mb-4">Our Top</h2>
        <h1 className="text-4xl w-[6em] sm:w-auto font-bold mb-6 md:text-6xl">Meet our top groomers</h1>
        <div className="flex flex-col md:flex-row md:-mx-2 mt-[4em] w-[80%]">
          <div className="md:w-1/3 px-2 mb-4">
            <div className="rounded-lg rounded-t-full overflow-hidden">
              <img className="w-full" src={Groomer1} alt="Groomer 1" />
              <div className="p-4 bg-[#F5F5F5] flex flex-col items-center mt-[0.8em]">
                <h3 className="text-xl font-bold mb-2">Oliver Mitchell</h3>
                <p className="text-gray-700">Pet Styling Specialist</p>
              </div>
            </div>
          </div>
          <div className="md:w-1/3 px-2 mb-4">
            <div className="rounded-lg rounded-t-full overflow-hidden">
              <img className="w-full" src={Groomer2} alt="Groomer 2" />
              <div className="p-4 bg-[#F5F5F5] flex flex-col items-center mt-[0.8em]">
                <h3 className="text-xl font-bold mb-2">Sophia Reynolds</h3>
                <p className="text-gray-700">Fur Care Technician</p>
              </div>
            </div>
          </div>
          <div className="md:w-1/3 px-2 mb-4">
            <div className="rounded-lg rounded-t-full overflow-hidden">
              <img className="w-full" src={Groomer3} alt="Groomer 3" />
              <div className="p-4 bg-[#F5F5F5] flex flex-col items-center mt-[0.8em]">
                <h3 className="text-xl font-bold mb-2">Ethan Anderson</h3>
                <p className="text-gray-700">Grooming Artisan</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center mt-[4em]">
          <CustomButton text="View All Members" />
        </div>
      </div>
    </section>
  );
};

export default TopGroomersSection;