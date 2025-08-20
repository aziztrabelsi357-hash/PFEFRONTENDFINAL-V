
const CustomButton = ({ text, slim = false }) => {
  return (
    <button className={`bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 ${slim ? 'py-2' : 'py-3'} rounded-md flex`}>
        <span>{text}</span>
        <div className="w-[1.6em] h-[1.6em] ml-3 bg-gray-100 rounded-full">
            <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            >
            <path d="M5 12h13M12 5l7 7-7 7" />
            </svg>
        </div>
    </button>
  )
}

export default CustomButton;
