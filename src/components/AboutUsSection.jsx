
import farm1 from '../assets/images/farm1.png';
import CustomButton from './CustomButton';

const AboutUsSection = () => {
  return (
    <section className="bg-[#FAF9F6] py-12">
      <div className="container mx-auto flex flex-col lg:flex-row w-full sm:items-center lg:w-[80%]">
        {/* Left container with rounded window image */}
        <div className="md:w-1/2 px-[2em]">
            <img className="rounded-t-full w-[300px] md:w-[500px] lg:[600px] mb-[1em] sm:mb-[4em] lg:mb-0" src={farm1} />
        </div>
        
        {/* Right container for text content */}
        <div className="md:w-1/2 px-6 lg:px-[4em] py-4 md:py-12">
          <h2 className="text-green-600 text-4xl font-bold mb-6">About Us</h2>
          <h1 className="text-[2.4em] sm:text-[3em] w-[6em] sm:w-[8em] font-bold mb-6 leading-[3rem] sm:leading-[4rem]">Empowering Farmers, Growing Together</h1>
          <p className="text-gray-700 mb-6 w-auto md:w-[30em]">
            At MyFarm, we empower you to manage crops and farms with AI-powered tools for disease detection, food and watering management, and complete farm tracking. Whether you grow plants, raise farms, or both, our platform helps you boost productivity and farm smarter.
          </p>
          <div className="flex items-start mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5 text-green-700 mt-1 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-gray-700">Accurate and reliable farm record keeping for farms and plants</p>
          </div>
          <div className="flex items-start mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5 text-green-700 mt-1 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            <p className="text-gray-700">AI-powered insights on farmand plant health, food, and watering</p>
          </div>
          <div className="flex items-start mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5 text-green-700 mt-1 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            <p className="text-gray-700">Expert tips and recommended products for farmcare, crop growth, and efficient farm management</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUsSection;