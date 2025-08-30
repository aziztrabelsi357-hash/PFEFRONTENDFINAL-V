import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaDog, FaLeaf, FaHeartbeat, FaClipboardList, FaUserShield, FaSeedling, FaTint, FaAppleAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const services = [
  {
    icon: <FaHeartbeat size={40} className="text-green-600" />,
    title: "AI farmDisease Detection",
    desc: "Detect farmdiseases instantly with AI.",
    details: "Upload farmimages or symptoms and our AI will analyze for early signs of disease, helping you protect your livestock efficiently."
  },
  {
    icon: <FaLeaf size={40} className="text-green-600" />,
    title: "AI Plant Disease Detection",
    desc: "Identify plant diseases with a photo.",
    details: "Our AI scans plant images to spot diseases early, so you can treat crops before problems spread."
  },
  {
    icon: <FaClipboardList size={40} className="text-green-600" />,
    title: "Farm Records & Reports",
    desc: "Track all your farms, crops, and farm activities.",
    details: "Keep detailed records of farmhealth, crop growth, treatments, and farm operations in one place."
  },
  {
    icon: <FaAppleAlt size={40} className="text-green-600" />,
    title: "farm& Plant Food Management",
    desc: "Manage feeding schedules and supplies.",
    details: "Plan and track food for farms and plants, ensuring optimal nutrition and growth."
  },
  {
    icon: <FaTint size={40} className="text-green-600" />,
    title: "Watering & Irrigation",
    desc: "Organize and monitor watering routines.",
    details: "Set up and track irrigation for crops and water schedules for farms to maximize farm productivity."
  },
  {
    icon: <FaUserShield size={40} className="text-green-600" />,
    title: "Secure & Reliable",
    desc: "Your farm data is safe with us.",
    details: "We prioritize your privacy with end-to-end encryption and secure cloud storage."
  }
];
const steps = [
  { title: "Sign Up", details: "Create an account to start managing your farm.", route: "/register" },
  { title: "Add farms & Plants", details: "Register your farms and crops to begin tracking their health and growth.", route: "/create-farm" },
  { title: "Upload Images or Data", details: "Upload photos or enter details for AI-powered disease detection and farm analysis.", route: "/ai-detection" },
  { title: "Manage Food & Watering", details: "Plan and monitor feeding and watering schedules for all farm resources.", route: "/products" },
  { title: "Get Instant Insights", details: "Receive AI-generated reports and tips for improving your farm’s productivity.", route: "/ai-detection" },
  { title: "Track Farm History", details: "Monitor your farm’s progress over time with detailed records and analytics.", route: "/dashboard" }
];

const ServicesSection = () => {
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50 text-gray-900">
      {/* Services Section */}
      <section id="features" className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-8 text-green-700">Why Choose MyFarm?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <motion.div 
              key={index} 
              className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, delay: index * 0.2 }}
              onClick={() => setSelectedService(service)}
            >
              <div className="text-blue-600 mb-4">{service.icon}</div>
              <h3 className="font-semibold text-lg">{service.title}</h3>
              <p className="text-gray-600">{service.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Modal Popup */}
      <AnimatePresence>
        {selectedService && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedService(null)}
          >
            <motion.div 
              className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center relative"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="absolute top-2 right-4 text-gray-600 text-2xl"
                onClick={() => setSelectedService(null)}
              >&times;</button>
              <div className="text-blue-600 mb-4">{selectedService.icon}</div>
              <h3 className="text-xl font-bold">{selectedService.title}</h3>
              <p className="text-gray-600 mt-2">{selectedService.details}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
  <section className="py-20 bg-gray-100 px-6 text-center">
  <h2 className="text-3xl font-bold mb-8 text-green-700">How It Works</h2>
      <div className="flex flex-wrap justify-center gap-8">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            className="bg-white p-6 rounded-lg shadow-md w-60 cursor-pointer transition-all hover:scale-105 hover:shadow-lg hover:bg-green-50 group"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            onClick={() => setSelectedStep(step)}
          >
            <h3 className="font-semibold group-hover:text-green-700">{step.title}</h3>
          </motion.div>
        ))}
      </div>

      {/* Popup Modal for Step Details */}
      <AnimatePresence>
        {selectedStep && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedStep(null)}
          >
            <motion.div
              className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center relative"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-2 right-4 text-gray-600 text-2xl"
                onClick={() => setSelectedStep(null)}
              >&times;</button>
              <div className="flex flex-col items-center mb-4">
                {/* Logo/Icon for the step */}
                {selectedStep.title.includes('Sign Up') && <FaUserShield size={40} className="text-green-600 mb-2" />}
                {selectedStep.title.includes('Add farms') && <FaDog size={40} className="text-green-600 mb-2" />}
                {selectedStep.title.includes('Plants') && !selectedStep.title.includes('Add farms') && <FaLeaf size={40} className="text-green-600 mb-2" />}
                {selectedStep.title.includes('Upload') && <FaClipboardList size={40} className="text-green-600 mb-2" />}
                {selectedStep.title.includes('Food') && <FaAppleAlt size={40} className="text-green-600 mb-2" />}
                {selectedStep.title.includes('Watering') && <FaTint size={40} className="text-green-600 mb-2" />}
                {selectedStep.title.includes('Insights') && <FaHeartbeat size={40} className="text-green-600 mb-2" />}
                {selectedStep.title.includes('History') && <FaClipboardList size={40} className="text-green-600 mb-2" />}
              </div>
              <h3 className="text-xl font-bold mb-2">{selectedStep.title}</h3>
              <p className="text-gray-600 mt-2 mb-6">{selectedStep.details}</p>
              <button
                className="px-6 py-2 bg-green-600 text-white rounded-md shadow hover:bg-green-700 transition-colors duration-200"
                onClick={() => {
                  navigate(selectedStep.route);
                  setSelectedStep(null);
                }}
              >
                Go to {selectedStep.title}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
    </div>
  );
};

export default ServicesSection;
