
import PetCareLogo from "../assets/images/pet-care-logo.png";
import FarmLogo from "../assets/images/farm-logo.png";
import FacebookIcon from "../assets/images/facebook-icon.png";
import InstagramIcon from "../assets/images/instagram-icon.png";
import YouTubeIcon from "../assets/images/youtube-icon.png";
import TwitterIcon from "../assets/images/twitter-icon.png";

const Footer = () => {
  return (
    <footer className="bg-gray-200 pt-8">
      <div className="container mx-auto flex flex-col md:flex-row justify-evenly  px-[2em] md:px-0">
        <div className="w-auto md:w-1/3 flex flex-col gap-y-4">
          <div className="flex items-center mb-4">
                <img
                  src={FarmLogo}
                  alt="Company Logo"
                  className="w-20 h-20 mr-4 rounded-lg transition duration-200 cursor-pointer  hover:scale-125"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  style={{ minWidth: '5rem' }}
                />
            <p className="text-black mb-0 text-italian font-bold">
              Welcome to <span className="text-green-600 font-bold">MyFarm</span> , your AI-powered platform for smart farm management. Detect farmand plant diseases, manage food and watering, and track your entire farm’s progress—all in one place. Grow healthier crops, raise thriving farms, and boost your farm’s productivity with ease.
            </p>
          </div>
          <div className="flex gap-x-6 justify-end ">
            <img
              className="w-[25px] h-[25px] cursor-pointer hover:scale-150 transition-transform duration-200"
              src={FacebookIcon}
            />
            <img
              className="w-[25px] h-[25px] cursor-pointer hover:scale-150 transition-transform duration-200"
              src={InstagramIcon}
            />
            <img
              className="w-[25px] h-[25px] cursor-pointer hover:scale-150  transition-transform duration-200"
              src={YouTubeIcon}
            />
            <img
              className="w-[25px] h-[25px] cursor-pointer hover:scale-150  transition-transform duration-200"
              src={TwitterIcon}
            />
            {/* Add more social media icons here */}
          </div>
        </div>
      
      </div>
      <div className="w-full h-[5em] flex justify-center items-center font-bold mt-[5em] border-t-2  py-[1em] px-6 md:px-0">
        <p>Copyright @2025 by MyFarm. All rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
