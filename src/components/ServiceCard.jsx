import React from 'react'

const ServiceCard = ({ title, description, image, altText }) => {
  return (
    <div className="bg-[#FAF9F6] shadow rounded-lg p-6 flex flex-col sm:flex-row items-center sm:justify-evenly">
      <img src={image} alt={altText} className="w-auto sm:w-[200px] h-auto mb-4 rounded-md" />
      <div className='sm:px-[2em] text-left flex flex-col justify-center'>
          <h3 className="text-lg font-bold mb-2">{title}</h3>
          <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}

export default ServiceCard;
