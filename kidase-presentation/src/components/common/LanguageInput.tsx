import React from 'react';

interface LanguageInputProps {
  // TODO: Define props for multilingual text input
  language: string;
  value: string;
  onChange: (value: string, language: string) => void;
  placeholder?: string;
  label?: string;
}

/**
 * LanguageInput - Input component for multilingual text entry
 * TODO: Implement input with language selector and proper text direction support
 */
export const LanguageInput: React.FC<LanguageInputProps> = ({
  language,
  value,
  onChange,
  placeholder,
  label
}) => {
  return (
    <div className="language-input">
      {label && <label>{label}</label>}
      <div className="language-input__wrapper">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value, language)}
          placeholder={placeholder}
          lang={language}
        />
        <span className="language-input__indicator">{language}</span>
      </div>
    </div>
  );
};

export default LanguageInput;
