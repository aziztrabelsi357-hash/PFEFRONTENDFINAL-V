import { useState } from 'react';
import { FaPaw } from 'react-icons/fa'; // For paw icon

const CategoryDropdown = () => {
  const categories = [
    'Nutrition or Diet',
    'Osteoarthritis',
    'Behavior',
    'Kidney Failure',
    'Ophthalmology',
    'Overweight',
    'Digestive Issues',
  ];
  const [selected, setSelected] = useState('');

  const handleChange = (e) => {
    setSelected(e.target.value);
    // Add logic to filter content based on category if needed
  };

  return (
    <div className="relative w-full md:w-64">
      <select
        value={selected}
        onChange={handleChange}
        className="w-full p-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
        aria-label="Select a category"
      >
        <option value="">Select a category</option>
        {categories.map((category, index) => (
          <option key={index} value={category}>
            {category}
          </option>
        ))}
      </select>
      <FaPaw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500" />
    </div>
  );
};

export default CategoryDropdown;