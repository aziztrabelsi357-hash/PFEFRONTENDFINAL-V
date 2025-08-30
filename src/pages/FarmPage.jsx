import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion'; // For animations
import CategoryDropdown from '../components/CategoryDropdown';
import image1 from '../assets/images/farm1.jpg';
import image2 from '../assets/images/farm1.png';
import image3 from '../assets/images/vaccination.png';

const FarmPage = () => {
  const [careTips, setCareTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const healthImages = [
    'https://images.ctfassets.net/b85ozb2q358o/d863425c73c7c617a9774422e6436312d34f417f79d87066c70c0d76adc4f858/3731c6967b8127db7f493a334035c07c/image.png',
    'https://fr.mypet.com/wp-content/uploads/sites/10/2024/04/nettoyage-yeux-chien.png',
    'https://www.myvetshop.fr/img/cms/helena-lopes-S3TPJCOIRoo-unsplash.jpg',
  ];

  const diseaseImages = [
    'https://www.shutterstock.com/image-photo/vet-examining-farm-cat-puppy-600nw-1479238910.jpg',
    'https://i.pinimg.com/736x/0e/47/ea/0e47eaab34ef1d9f96757afaa6e38102.jpg',
    'https://i.pinimg.com/222x/16/6a/34/166a34c139c329802e19d9285759237b.jpg',
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

  const careTipsResponse = await axios.get('http://localhost:8080/api/care-tips');
  setCareTips(careTipsResponse.data.slice(0, 3));
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sections = [
    {
      title: 'Health and Well-Being',
      articles: careTips.map((careTip, index) => ({
        id: careTip.id,
        title: careTip.title,
        image: healthImages[index % healthImages.length],
        link: `/care-tips/${careTip.id}`,
      })),
      allArticlesLink: '/care-tips',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section in a rounded box with margin */}
      <div className="m-[15px] rounded-xl overflow-hidden shadow-lg">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative bg-gradient-to-r from-blue-600 to-blue-400 h-[500px] flex items-center justify-center bg-cover bg-center"
          style={{ backgroundImage: `url(${image2})` }}
        >
          <div className="absolute inset-0 bg-black opacity-50"></div>
          <div className="relative text-center text-white z-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Care for Your farm</h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto">
              Discover expert tips and resources to keep your farmhealthy and happy.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Banner and Dropdown Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 bg-white shadow-lg rounded-xl overflow-hidden"
          >
            <img
              src={image3}
              alt="Vaccination"
              className="w-full h-64 object-cover"
              loading="lazy"
            />
            <div className="p-6 text-center">
              <p className="text-lg font-semibold text-gray-800">
                Vaccinating your farm: which diseases should you protect against?
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full md:w-auto"
          >
            <CategoryDropdown />
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex-1 bg-white shadow-lg rounded-xl overflow-hidden"
          >
            <img
              src={image1}
              alt="farmFood"
              className="w-full h-64 object-cover"
              loading="lazy"
            />
            <div className="p-6 text-center">
              <p className="text-lg font-semibold text-gray-800">
                VETERINARY HPM Kibble: a low-carbohydrate, high-protein formulation to meet your farm's needs.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Articles Sections */}
      {loading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center py-12">{error}</div>
      ) : (
        sections.map((section, index) => (
          <div key={index} className="max-w-7xl mx-auto px-4 py-12">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-bold text-gray-800 mb-8 text-center"
            >
              {section.title}
            </motion.h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {section.articles.map((article, idx) => (
                <motion.div
                  key={article.id}
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-white shadow-md rounded-xl overflow-hidden transform hover:scale-105 transition-transform duration-300"
                >
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">
                      {article.title}
                    </h3>
                    <Link
                      to={article.link}
                      className="inline-block bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-300"
                      aria-label={`Learn more about ${article.title}`}
                    >
                      Learn More
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <Link
                to={section.allArticlesLink}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-300"
                aria-label={`View all articles on ${section.title}`}
              >
                All articles on {section.title.toLowerCase()}
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default FarmPage;