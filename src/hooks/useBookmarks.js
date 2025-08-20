import { useState, useEffect } from 'react';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState([]);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('farmDiseaseBookmarks');
    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks));
      } catch (error) {
        console.error('Failed to parse bookmarks', error);
        localStorage.removeItem('farmDiseaseBookmarks');
      }
    }
  }, []);

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('farmDiseaseBookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const toggleBookmark = (id) => {
    setBookmarks(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  return { bookmarks, toggleBookmark };
}