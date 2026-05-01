/*
 * Copyright (c) 2025-2026 Tapas Tracker
 *
 * This file is part of Tapas Tracker.
 *
 * Tapas Tracker is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Tapas Tracker is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Tapas Tracker.  If not, see <https://www.gnu.org/licenses/agpl-3.0.html>.
 */

import React, { useState, useRef, useCallback } from "react";

export function LexicalToolbarDropdown({ id, label, options, activeValue, onSelect }: {
  id: string;
  label: string;
  options: string[];
  activeValue: string;
  onSelect: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Verhindert das Schließen beim Klicken innerhalb des Menüs
  const handleAction = (val: string) => {
    onSelect(val);
    setIsOpen(false);
  };

  return (
    <div id={id} ref={containerRef}>
      <button
        type="button"
        className="toolbar-item"
        onMouseDown={(e) => e.preventDefault()} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text">{label}</span>
        <i className="chevron-down" />
      </button>

      {isOpen && (
        <div 
          className="dropdown"
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.map((opt) => (
            <button
              key={opt}
              className={`item ${opt === activeValue ? 'selected' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleAction(opt)}
            >
              <span className="checkmark-container">
                {opt === activeValue ? '✓' : ''}
              </span>
              <span className="item-text">{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
