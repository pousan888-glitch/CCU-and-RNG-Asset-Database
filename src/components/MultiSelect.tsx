import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, MapPin, X } from "lucide-react";

interface MultiSelectProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export default function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = "-- Select --",
  className = "",
  icon
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleOption = (option: string) => {
    const isSelected = selectedValues.includes(option);
    if (isSelected) {
      onChange(selectedValues.filter(val => val !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([...options]);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  // Label display: if all selected, say "All Selected". If empty, show placeholder. Otherwise, show comma separated list.
  const getDisplayLabel = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === options.length) return "All Areas Selected";
    if (selectedValues.length <= 2) {
      return selectedValues.join(", ");
    }
    return `${selectedValues.length} Areas Selected`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer min-w-[160px]"
      >
        <div className="flex items-center space-x-1.5 overflow-hidden text-ellipsis whitespace-nowrap mr-1">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="truncate">{getDisplayLabel()}</span>
        </div>
        <div className="flex items-center space-x-1 shrink-0">
          {selectedValues.length > 0 && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll(e);
              }}
              className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl p-3 min-w-[220px] max-w-xs space-y-2">
          {/* Action buttons */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-[11px]">
            <span className="text-slate-400 font-medium">Selected: {selectedValues.length}</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-red-500 hover:text-red-650 font-bold hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Option list */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
            {options.map((option) => {
              const checked = selectedValues.includes(option);
              return (
                <div
                  key={option}
                  onClick={() => handleToggleOption(option)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    checked 
                      ? "bg-blue-50 text-blue-700 font-semibold" 
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{option}</span>
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all shrink-0 ${
                    checked 
                      ? "bg-blue-600 border-blue-600 text-white" 
                      : "border-slate-300 bg-white"
                  }`}>
                    {checked && <Check className="w-2.5 h-2.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
