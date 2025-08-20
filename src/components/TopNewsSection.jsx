import React from 'react';
import News1 from '../assets/images/news-1.png';
import News2 from '../assets/images/news-2.png';
import News3 from '../assets/images/news-3.png';
import CustomButton from './CustomButton';

const TopNewsSection = () => {
  return (
    <section className="bg-[#F5F5F5] py-12 pt-[6em]">
      <div className="container mx-auto flex flex-col items-center">
        <h2 className="text-blue-500 text-2xl font-bold mb-2 md:text-2xl md:mb-4">Top News</h2>
        <h1 className="text-4xl w-[6em] sm:w-auto font-bold mb-6 md:text-6xl">Read our latest news</h1>
        <div className="flex flex-col md:flex-row md:-mx-2 mt-[4em] w-[80%]">
        <div className="md:w-1/3 px-2 mb-4">
            <div className="rounded-lg overflow-hidden">
              <img className="w-full" src={News1} alt="Groomer 2" />
              <div className="p-4 flex flex-col items-start mt-[0.8em]">
                <h3 className="text-xl font-bold mb-2">Canine Couture</h3>
                <p className="text-gray-700">In a stunning display of creativity and style, local pet groomers showcased their talent at the annual Canine Couture fashion show. farms of all breeds strutted down the runway, sporting elaborate hairstyles, vibrant colors, and even miniature accessories.</p>
              </div>
            </div>
          </div>
          <div className="md:w-1/3 px-2 mb-4">
            <div className="rounded-lg overflow-hidden">
              <img className="w-full" src={News2} alt="Groomer 1" />
              <div className="p-4 flex flex-col items-start mt-[0.8em]">
                <h3 className="text-xl font-bold mb-2">Eco-Friendly Pet Pampering</h3>
                <p className="text-gray-700">The pet grooming industry is going green with the introduction of a new line of organic grooming products. Pet groomers across the city are embracing eco-conscious practices by using all-natural shampoos, conditioners, and grooming tools. </p>
              </div>
            </div>
          </div>
          <div className="md:w-1/3 px-2 mb-4">
            <div className="rounded-lg overflow-hidden">
              <img className="w-full" src={News3} alt="Groomer 3" />
              <div className="p-4 flex flex-col items-start mt-[0.8em]">
                <h3 className="text-xl font-bold mb-2">Pet Spa Sensation</h3>
                <p className="text-gray-700">A new luxury pet grooming retreat has opened its doors, offering a five-star experience. Designed to cater to the needs of pampered pets, this state-of-the-art spa offers a range of indulgent treatments, including aromatherapy baths, pawdicures, and fur styling sessions.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center mt-[4em]">
          <CustomButton text="View Blog" />
        </div>
      </div>
    </section>
  );
};

export default TopNewsSection;