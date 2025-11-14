// components/CardDesigner.js
"use client";
import { useState, useRef } from "react";
import { X, Upload } from "lucide-react";
import toast from "react-hot-toast";

export default function CardDesigner({ onSave, onCancel, initialDesign = null }) {
  const cardRef = useRef(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(initialDesign?.logo?.url || "");

  const fonts = [
    { name: "Inter", value: "Inter, sans-serif" },
    { name: "Poppins", value: "Poppins, sans-serif" },
    { name: "Roboto", value: "Roboto, sans-serif" },
    { name: "Montserrat", value: "Montserrat, sans-serif" },
    { name: "Playfair", value: "Playfair Display, serif" },
    { name: "Dancing Script", value: "Dancing Script, cursive" },
  ];

  const patterns = [
    { id: "none", name: "None" },
    { id: "stripes", name: "Stripes" },
    { id: "dots", name: "Dots" },
    { id: "grid", name: "Grid" },
    { id: "waves", name: "Waves" },
    { id: "zigzag", name: "Zigzag" },
  ];

  const templates = [
    // 5 Gradient Templates
    {
      id: "grad-1",
      name: "Ocean Blue",
      type: "gradient",
      design: {
        background: {
          type: "gradient",
          gradientStart: "#0ea5e9",
          gradientEnd: "#0369a1",
          direction: "to bottom right",
          pattern: "none",
          opacity: 100,
        },
        title: { text: "PRODUCT NAME", color: "#ffffff", fontSize: 48, fontWeight: "bold", fontFamily: "Poppins, sans-serif", shadow: true },
        subtitle: { text: "", color: "#fbbf24", fontSize: 20, fontFamily: "Inter, sans-serif" },
        logo: { show: false, url: "", size: 60, position: "top-left", opacity: 100 },
        badge: { show: false, text: "NEW", position: "top-right", bgColor: "#ef4444", textColor: "#ffffff", fontSize: 12 },
        icon: { show: false, emoji: "🍕", position: "top-left", size: 48 },
        border: { radius: 16, color: "#0284c7", width: 0, shadow: "xl" },
      },
    },
    {
      id: "grad-2",
      name: "Sunset",
      type: "gradient",
      design: {
        background: {
          type: "gradient",
          gradientStart: "#f59e0b",
          gradientEnd: "#dc2626",
          direction: "to bottom right",
          pattern: "none",
          opacity: 100,
        },
        title: { text: "PRODUCT NAME", color: "#ffffff", fontSize: 48, fontWeight: "900", fontFamily: "Montserrat, sans-serif", shadow: true },
        subtitle: { text: "", color: "#fef3c7", fontSize: 20, fontFamily: "Montserrat, sans-serif" },
        logo: { show: false, url: "", size: 60, position: "top-left", opacity: 100 },
        badge: { show: false, text: "HOT", position: "top-right", bgColor: "#fef3c7", textColor: "#92400e", fontSize: 12 },
        icon: { show: false, emoji: "🔥", position: "top-left", size: 48 },
        border: { radius: 20, color: "#ea580c", width: 0, shadow: "2xl" },
      },
    },
    {
      id: "grad-3",
      name: "Purple Dream",
      type: "gradient",
      design: {
        background: {
          type: "gradient",
          gradientStart: "#8b5cf6",
          gradientEnd: "#6366f1",
          direction: "to bottom",
          pattern: "none",
          opacity: 100,
        },
        title: { text: "PRODUCT NAME", color: "#ffffff", fontSize: 48, fontWeight: "bold", fontFamily: "Inter, sans-serif", shadow: true },
        subtitle: { text: "", color: "#c4b5fd", fontSize: 20, fontFamily: "Inter, sans-serif" },
        logo: { show: false, url: "", size: 60, position: "top-left", opacity: 100 },
        badge: { show: false, text: "NEW", position: "top-right", bgColor: "#c4b5fd", textColor: "#5b21b6", fontSize: 12 },
        icon: { show: false, emoji: "💎", position: "top-left", size: 48 },
        border: { radius: 12, color: "#7c3aed", width: 0, shadow: "xl" },
      },
    },
    {
      id: "grad-4",
      name: "Fresh Mint",
      type: "gradient",
      design: {
        background: {
          type: "gradient",
          gradientStart: "#10b981",
          gradientEnd: "#059669",
          direction: "to right",
          pattern: "none",
          opacity: 100,
        },
        title: { text: "PRODUCT NAME", color: "#ffffff", fontSize: 48, fontWeight: "bold", fontFamily: "Roboto, sans-serif", shadow: true },
        subtitle: { text: "", color: "#d1fae5", fontSize: 20, fontFamily: "Roboto, sans-serif" },
        logo: { show: false, url: "", size: 60, position: "top-left", opacity: 100 },
        badge: { show: false, text: "FRESH", position: "top-right", bgColor: "#d1fae5", textColor: "#065f46", fontSize: 12 },
        icon: { show: false, emoji: "🌿", position: "top-left", size: 48 },
        border: { radius: 16, color: "#059669", width: 0, shadow: "lg" },
      },
    },
    {
      id: "grad-5",
      name: "Rose Gold",
      type: "gradient",
      design: {
        background: {
          type: "gradient",
          gradientStart: "#fbbf24",
          gradientEnd: "#f59e0b",
          direction: "to bottom right",
          pattern: "none",
          opacity: 100,
        },
        title: { text: "PRODUCT NAME", color: "#ffffff", fontSize: 48, fontWeight: "bold", fontFamily: "Playfair Display, serif", shadow: true },
        subtitle: { text: "", color: "#ffffff", fontSize: 20, fontFamily: "Playfair Display, serif" },
        logo: { show: false, url: "", size: 60, position: "top-left", opacity: 100 },
        badge: { show: false, text: "PREMIUM", position: "top-right", bgColor: "#ffffff", textColor: "#92400e", fontSize: 12 },
        icon: { show: false, emoji: "👑", position: "top-left", size: 48 },
        border: { radius: 24, color: "#d97706", width: 0, shadow: "xl" },
      },
    },
    // 2 Solid Templates
    {
      id: "solid-1",
      name: "Deep Blue",
      type: "solid",
      design: {
        background: {
          type: "solid",
          solidColor: "#1e40af",
          pattern: "none",
          opacity: 100,
        },
        title: { text: "PRODUCT NAME", color: "#ffffff", fontSize: 48, fontWeight: "bold", fontFamily: "Inter, sans-serif", shadow: true },
        subtitle: { text: "", color: "#93c5fd", fontSize: 20, fontFamily: "Inter, sans-serif" },
        logo: { show: false, url: "", size: 60, position: "top-left", opacity: 100 },
        badge: { show: false, text: "NEW", position: "top-right", bgColor: "#93c5fd", textColor: "#1e3a8a", fontSize: 12 },
        icon: { show: false, emoji: "⭐", position: "top-left", size: 48 },
        border: { radius: 12, color: "#1e3a8a", width: 3, shadow: "lg" },
      },
    },
    {
      id: "solid-2",
      name: "Ruby Red",
      type: "solid",
      design: {
        background: {
          type: "solid",
          solidColor: "#dc2626",
          pattern: "none",
          opacity: 100,
        },
        title: { text: "PRODUCT NAME", color: "#ffffff", fontSize: 48, fontWeight: "900", fontFamily: "Montserrat, sans-serif", shadow: true },
        subtitle: { text: "", color: "#fecaca", fontSize: 20, fontFamily: "Montserrat, sans-serif" },
        logo: { show: false, url: "", size: 60, position: "top-left", opacity: 100 },
        badge: { show: false, text: "HOT", position: "top-right", bgColor: "#fecaca", textColor: "#7f1d1d", fontSize: 12 },
        icon: { show: false, emoji: "🔥", position: "top-left", size: 48 },
        border: { radius: 16, color: "#991b1b", width: 4, shadow: "xl" },
      },
    },
    // 2 Pattern Templates
    {
      id: "pattern-1",
      name: "Blue Stripes",
      type: "pattern",
      design: {
        background: {
          type: "pattern",
          pattern: "stripes",
          gradientStart: "#3b82f6",
          gradientEnd: "#1e40af",
          opacity: 100,
        },
        title: { text: "PRODUCT NAME", color: "#ffffff", fontSize: 48, fontWeight: "bold", fontFamily: "Poppins, sans-serif", shadow: true },
        subtitle: { text: "", color: "#dbeafe", fontSize: 20, fontFamily: "Poppins, sans-serif" },
        logo: { show: false, url: "", size: 60, position: "top-left", opacity: 100 },
        badge: { show: false, text: "SPECIAL", position: "top-right", bgColor: "#dbeafe", textColor: "#1e3a8a", fontSize: 12 },
        icon: { show: false, emoji: "🎯", position: "top-left", size: 48 },
        border: { radius: 16, color: "#1e40af", width: 0, shadow: "xl" },
      },
    },
    {
      id: "pattern-2",
      name: "Red Dots",
      type: "pattern",
      design: {
        background: {
          type: "pattern",
          pattern: "dots",
          gradientStart: "#dc2626",
          gradientEnd: "#7f1d1d",
          opacity: 100,
        },
        title: { text: "PRODUCT NAME", color: "#ffffff", fontSize: 48, fontWeight: "900", fontFamily: "Montserrat, sans-serif", shadow: true },
        subtitle: { text: "", color: "#fee2e2", fontSize: 20, fontFamily: "Montserrat, sans-serif" },
        logo: { show: false, url: "", size: 60, position: "top-left", opacity: 100 },
        badge: { show: false, text: "SALE", position: "top-right", bgColor: "#fee2e2", textColor: "#7f1d1d", fontSize: 12 },
        icon: { show: false, emoji: "💯", position: "top-left", size: 48 },
        border: { radius: 20, color: "#991b1b", width: 0, shadow: "2xl" },
      },
    },
  ];

  const [design, setDesign] = useState(
    initialDesign || {
      background: {
        type: "gradient",
        solidColor: "#0284c7",
        gradientStart: "#0284c7",
        gradientEnd: "#0369a1",
        direction: "to bottom right",
        pattern: "none",
        opacity: 100,
      },
      title: {
        text: "PRODUCT NAME",
        color: "#ffffff",
        fontSize: 48,
        fontWeight: "bold",
        fontFamily: "Inter, sans-serif",
        shadow: true,
        position: "center",
      },
      subtitle: {
        text: "",
        color: "#fbbf24",
        fontSize: 20,
        fontFamily: "Inter, sans-serif",
      },
      logo: {
        show: false,
        url: "",
        size: 60,
        position: "top-left",
        opacity: 100,
      },
      badge: {
        show: false,
        text: "NEW",
        position: "top-right",
        bgColor: "#ef4444",
        textColor: "#ffffff",
        fontSize: 12,
      },
      icon: {
        show: false,
        emoji: "🍕",
        position: "top-left",
        size: 48,
      },
      border: {
        radius: 16,
        color: "#0284c7",
        width: 0,
        shadow: "xl",
      },
    }
  );

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo size should be less than 2MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setDesign({
          ...design,
          logo: { ...design.logo, url: reader.result, show: true },
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const applyTemplate = (template) => {
    setDesign({
      ...design,
      ...template.design,
      title: { ...design.title, ...template.design.title },
      subtitle: { ...design.subtitle, ...template.design.subtitle },
      logo: { ...design.logo, ...template.design.logo },
      badge: { ...design.badge, ...template.design.badge },
      icon: { ...design.icon, ...template.design.icon },
      border: { ...design.border, ...template.design.border },
      background: { ...design.background, ...template.design.background },
    });
    toast.success(`Applied template: ${template.name}`);
  };

  const getBackgroundStyle = () => {
    const bg = design.background;
    let style = {};

    if (bg.type === "solid") {
      style.backgroundColor = bg.solidColor;
    } else if (bg.type === "gradient") {
      style.backgroundImage = `linear-gradient(${bg.direction}, ${bg.gradientStart}, ${bg.gradientEnd})`;
    } else if (bg.type === "pattern") {
      switch (bg.pattern) {
        case "stripes":
          style.backgroundImage = `repeating-linear-gradient(45deg, ${bg.gradientStart}, ${bg.gradientStart} 10px, ${bg.gradientEnd} 10px, ${bg.gradientEnd} 20px)`;
          break;
        case "dots":
          style.backgroundImage = `radial-gradient(circle, ${bg.gradientEnd} 2px, transparent 2px)`;
          style.backgroundSize = "20px 20px";
          style.backgroundColor = bg.gradientStart;
          break;
        case "grid":
          style.backgroundImage = `linear-gradient(${bg.gradientEnd} 1px, transparent 1px), linear-gradient(90deg, ${bg.gradientEnd} 1px, transparent 1px)`;
          style.backgroundSize = "20px 20px";
          style.backgroundColor = bg.gradientStart;
          break;
        case "waves":
          style.backgroundImage = `repeating-radial-gradient(circle at 0 0, ${bg.gradientStart}, ${bg.gradientEnd} 10px, transparent 20px)`;
          break;
        case "zigzag":
          style.backgroundImage = `linear-gradient(135deg, ${bg.gradientStart} 25%, transparent 25%), linear-gradient(225deg, ${bg.gradientStart} 25%, transparent 25%)`;
          style.backgroundSize = "20px 20px";
          break;
      }
    }

    style.opacity = bg.opacity / 100;
    return style;
  };

  const getShadowClass = (shadow) => {
    const shadows = {
      none: "",
      sm: "shadow-sm",
      md: "shadow-md",
      lg: "shadow-lg",
      xl: "shadow-xl",
      "2xl": "shadow-2xl",
    };
    return shadows[shadow] || "shadow-lg";
  };

  const getLogoPosition = () => {
    const positions = {
      "top-left": { top: "12px", left: "12px" },
      "top-right": { top: "12px", right: "12px" },
      "bottom-left": { bottom: "12px", left: "12px" },
      "bottom-right": { bottom: "12px", right: "12px" },
      center: {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      },
    };
    return positions[design.logo.position] || positions["top-left"];
  };

  const handleSave = () => {
    onSave(design, logoFile);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 mb-4 flex items-center justify-between sticky top-4 z-10 border border-gray-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              🎨 Card Designer
            </h2>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
              >
                ✓ Save Design
              </button>
              <button
                onClick={onCancel}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Templates - Single Row */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-4 border border-gray-200 dark:border-slate-700">
            <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">
              ⚡ Quick Start Templates
            </h3>
            <div className="grid grid-cols-9 gap-3">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="group border-2 border-gray-200 dark:border-slate-600 rounded-lg p-2 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all"
                >
                  <div className="aspect-video rounded overflow-hidden mb-2 shadow-md">
                    <div
                      style={
                        template.design.background.type === "solid"
                          ? {
                              backgroundColor:
                                template.design.background.solidColor,
                            }
                          : template.design.background.type === "gradient"
                          ? {
                              backgroundImage: `linear-gradient(${template.design.background.direction}, ${template.design.background.gradientStart}, ${template.design.background.gradientEnd})`,
                            }
                          : {}
                      }
                      className="w-full h-full flex items-center justify-center"
                    >
                      <p className="text-white text-[6px] font-bold px-1 text-center">
                        {template.name}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center truncate">
                    {template.name}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Controls - Left Side, scrollable */}
            <div className="lg:col-span-3 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
              
              {/* Background Controls */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                  🎨 Background
                </h3>

                <div className="space-y-4">
                  {/* Type Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["solid", "gradient", "pattern"].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setDesign({
                              ...design,
                              background: { ...design.background, type },
                            })
                          }
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            design.background.type === type
                              ? "bg-indigo-600 text-white shadow-lg"
                              : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Solid Color */}
                  {design.background.type === "solid" && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Color
                      </label>
                      <input
                        type="color"
                        value={design.background.solidColor}
                        onChange={(e) =>
                          setDesign({
                            ...design,
                            background: {
                              ...design.background,
                              solidColor: e.target.value,
                            },
                          })
                        }
                        className="w-full h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-slate-600"
                      />
                    </div>
                  )}

                  {/* Gradient Colors */}
                  {design.background.type === "gradient" && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Start
                          </label>
                          <input
                            type="color"
                            value={design.background.gradientStart}
                            onChange={(e) =>
                              setDesign({
                                ...design,
                                background: {
                                  ...design.background,
                                  gradientStart: e.target.value,
                                },
                              })
                            }
                            className="w-full h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            End
                          </label>
                          <input
                            type="color"
                            value={design.background.gradientEnd}
                            onChange={(e) =>
                              setDesign({
                                ...design,
                                background: {
                                  ...design.background,
                                  gradientEnd: e.target.value,
                                },
                              })
                            }
                            className="w-full h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-slate-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          Direction
                        </label>
                        <select
                          value={design.background.direction}
                          onChange={(e) =>
                            setDesign({
                              ...design,
                              background: {
                                ...design.background,
                                direction: e.target.value,
                              },
                            })
                          }
                          className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                        >
                          <option value="to bottom">↓ Top to Bottom</option>
                          <option value="to top">↑ Bottom to Top</option>
                          <option value="to right">→ Left to Right</option>
                          <option value="to left">← Right to Left</option>
                          <option value="to bottom right">↘ Diagonal Right</option>
                          <option value="to bottom left">↙ Diagonal Left</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Pattern */}
                  {design.background.type === "pattern" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          Pattern Type
                        </label>
                        <select
                          value={design.background.pattern}
                          onChange={(e) =>
                            setDesign({
                              ...design,
                              background: {
                                ...design.background,
                                pattern: e.target.value,
                              },
                            })
                          }
                          className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                        >
                          {patterns
                            .filter((p) => p.id !== "none")
                            .map((pattern) => (
                              <option key={pattern.id} value={pattern.id}>
                                {pattern.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Color 1
                          </label>
                          <input
                            type="color"
                            value={design.background.gradientStart}
                            onChange={(e) =>
                              setDesign({
                                ...design,
                                background: {
                                  ...design.background,
                                  gradientStart: e.target.value,
                                },
                              })
                            }
                            className="w-full h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Color 2
                          </label>
                          <input
                            type="color"
                            value={design.background.gradientEnd}
                            onChange={(e) =>
                              setDesign({
                                ...design,
                                background: {
                                  ...design.background,
                                  gradientEnd: e.target.value,
                                },
                              })
                            }
                            className="w-full h-12 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-slate-600"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Opacity */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Opacity: {design.background.opacity}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={design.background.opacity}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          background: {
                            ...design.background,
                            opacity: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
{/* Logo Upload */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800 dark:text-white">
                    🖼️ Logo
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={design.logo.show}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          logo: { ...design.logo, show: e.target.checked },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {design.logo.show && (
                  <div className="space-y-4">
                    <div>
                      {logoPreview ? (
                        <div className="relative inline-block">
                          <img
                            src={logoPreview}
                            alt="Logo"
                            className="w-24 h-24 object-contain rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 p-2"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setLogoPreview("");
                              setLogoFile(null);
                              setDesign({
                                ...design,
                                logo: { ...design.logo, url: "" },
                              });
                            }}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Upload Logo
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            PNG, JPG up to 2MB
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleLogoUpload}
                          />
                        </label>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Size: {design.logo.size}px
                      </label>
                      <input
                        type="range"
                        min="30"
                        max="150"
                        value={design.logo.size}
                        onChange={(e) =>
                          setDesign({
                            ...design,
                            logo: {
                              ...design.logo,
                              size: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Position
                      </label>
                      <select
                        value={design.logo.position}
                        onChange={(e) =>
                          setDesign({
                            ...design,
                            logo: { ...design.logo, position: e.target.value },
                          })
                        }
                        className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                      >
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                        <option value="center">Center</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Opacity: {design.logo.opacity}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={design.logo.opacity}
                        onChange={(e) =>
                          setDesign({
                            ...design,
                            logo: {
                              ...design.logo,
                              opacity: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Title Settings */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
                <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">
                  ✏️ Title
                </h3>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={design.title.text}
                    onChange={(e) =>
                      setDesign({
                        ...design,
                        title: { ...design.title, text: e.target.value },
                      })
                    }
                    placeholder="PRODUCT NAME"
                    className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Color
                      </label>
                      <input
                        type="color"
                        value={design.title.color}
                        onChange={(e) =>
                          setDesign({
                            ...design,
                            title: { ...design.title, color: e.target.value },
                          })
                        }
                        className="w-full h-10 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Weight
                      </label>
                      <select
                        value={design.title.fontWeight}
                        onChange={(e) =>
                          setDesign({
                            ...design,
                            title: {
                              ...design.title,
                              fontWeight: e.target.value,
                            },
                          })
                        }
                        className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="900">Extra Bold</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Font Family
                    </label>
                    <select
                      value={design.title.fontFamily}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          title: { ...design.title, fontFamily: e.target.value },
                        })
                      }
                      className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                    >
                      {fonts.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Size: {design.title.fontSize}px
                    </label>
                    <input
                      type="range"
                      min="24"
                      max="72"
                      value={design.title.fontSize}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          title: {
                            ...design.title,
                            fontSize: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={design.title.shadow}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          title: { ...design.title, shadow: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Text Shadow
                  </label>
                </div>
              </div>

              {/* Subtitle */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
                <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">
                  📝 Subtitle (Optional)
                </h3>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={design.subtitle.text}
                    onChange={(e) =>
                      setDesign({
                        ...design,
                        subtitle: { ...design.subtitle, text: e.target.value },
                      })
                    }
                    placeholder="Best Value!"
                    className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm"
                  />

                  {design.subtitle.text && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Color
                          </label>
                          <input
                            type="color"
                            value={design.subtitle.color}
                            onChange={(e) =>
                              setDesign({
                                ...design,
                                subtitle: {
                                  ...design.subtitle,
                                  color: e.target.value,
                                },
                              })
                            }
                            className="w-full h-10 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-slate-600"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Size: {design.subtitle.fontSize}px
                          </label>
                          <input
                            type="range"
                            min="14"
                            max="32"
                            value={design.subtitle.fontSize}
                            onChange={(e) =>
                              setDesign({
                                ...design,
                                subtitle: {
                                  ...design.subtitle,
                                  fontSize: Number(e.target.value),
                                },
                              })
                            }
                            className="w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          Font Family
                        </label>
                        <select
                          value={design.subtitle.fontFamily}
                          onChange={(e) =>
                            setDesign({
                              ...design,
                              subtitle: {
                                ...design.subtitle,
                                fontFamily: e.target.value,
                              },
                            })
                          }
                          className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm"
                        >
                          {fonts.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Badge */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                    🏷️ Badge
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={design.badge.show}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          badge: { ...design.badge, show: e.target.checked },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {design.badge.show && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={design.badge.text}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          badge: { ...design.badge, text: e.target.value },
                        })
                      }
                      placeholder="NEW"
                      className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm"
                    />

                    <select
                      value={design.badge.position}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          badge: { ...design.badge, position: e.target.value },
                        })
                      }
                      className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm"
                    >
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                    </select>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">
                          BG Color
                        </label>
                        <input
                          type="color"
                          value={design.badge.bgColor}
                          onChange={(e) =>
                            setDesign({
                              ...design,
                              badge: {
                                ...design.badge,
                                bgColor: e.target.value,
                              },
                            })
                          }
                          className="w-full h-10 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-slate-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1 text-gray-700 dark:text-gray-300">
                          Text Color
                        </label>
                        <input
                          type="color"
                          value={design.badge.textColor}
                          onChange={(e) =>
                            setDesign({
                              ...design,
                              badge: {
                                ...design.badge,
                                textColor: e.target.value,
                              },
                            })
                          }
                          className="w-full h-10 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Icon */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                    ✨ Icon
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={design.icon.show}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          icon: { ...design.icon, show: e.target.checked },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {design.icon.show && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs mb-2 text-gray-700 dark:text-gray-300">
                        Select Emoji
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          "🍕",
                          "🔥",
                          "⭐",
                          "💎",
                          "🎉",
                          "👑",
                          "✨",
                          "💯",
                          "🎯",
                          "⚡",
                        ].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() =>
                              setDesign({
                                ...design,
                                icon: { ...design.icon, emoji },
                              })
                            }
                            className={`text-2xl p-2 rounded-lg border-2 transition-all ${
                              design.icon.emoji === emoji
                                ? "border-indigo-500 bg-indigo-50 dark:bg-slate-700"
                                : "border-gray-200 dark:border-slate-600 hover:border-gray-300"
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Size: {design.icon.size}px
                      </label>
                      <input
                        type="range"
                        min="24"
                        max="96"
                        value={design.icon.size}
                        onChange={(e) =>
                          setDesign({
                            ...design,
                            icon: {
                              ...design.icon,
                              size: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <select
                      value={design.icon.position}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          icon: { ...design.icon, position: e.target.value },
                        })
                      }
                      className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm"
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Border & Shadow */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-5 border border-gray-200 dark:border-slate-700">
                <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">
                  🖼️ Border & Shadow
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Border Radius: {design.border.radius}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={design.border.radius}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          border: {
                            ...design.border,
                            radius: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Border Color
                    </label>
                    <input
                      type="color"
                      value={design.border.color}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          border: { ...design.border, color: e.target.value },
                        })
                      }
                      className="w-full h-10 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-slate-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Border Width: {design.border.width}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={design.border.width}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          border: {
                            ...design.border,
                            width: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Shadow
                    </label>
                    <select
                      value={design.border.shadow}
                      onChange={(e) =>
                        setDesign({
                          ...design,
                          border: { ...design.border, shadow: e.target.value },
                        })
                      }
                      className="w-full p-2 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white text-sm"
                    >
                      <option value="none">None</option>
                      <option value="sm">Small</option>
                      <option value="md">Medium</option>
                      <option value="lg">Large</option>
                      <option value="xl">Extra Large</option>
                      <option value="2xl">2X Large</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview - Right Side (Compact) */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 sticky top-24 border border-gray-200 dark:border-slate-700">
                <h3 className="text-sm font-bold mb-3 text-center text-gray-800 dark:text-white">
                  Preview
                </h3>
                <div className="w-full" ref={cardRef}>
                  {/* Card Preview */}
                  <div
                    style={{
                      ...getBackgroundStyle(),
                      borderRadius: `${design.border.radius}px`,
                      border:
                        design.border.width > 0
                          ? `${design.border.width}px solid ${design.border.color}`
                          : "none",
                      position: "relative",
                      overflow: "hidden",
                      minHeight: "200px",
                    }}
                    className={`w-full flex flex-col justify-center items-center p-4 ${getShadowClass(
                      design.border.shadow
                    )}`}
                  >
                    {/* Logo */}
                    {design.logo.show && design.logo.url && (
                      <div
                        style={{
                          position: "absolute",
                          ...getLogoPosition(),
                          width: `${design.logo.size}px`,
                          height: `${design.logo.size}px`,
                          opacity: design.logo.opacity / 100,
                        }}
                      >
                        <img
                          src={design.logo.url}
                          alt="Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}

                    {/* Icon */}
                    {design.icon.show && (
                      <div
                        style={{
                          position: "absolute",
                          fontSize: `${design.icon.size}px`,
                          top: design.icon.position.includes("top")
                            ? "8px"
                            : "auto",
                          bottom: design.icon.position.includes("bottom")
                            ? "8px"
                            : "auto",
                          left: design.icon.position.includes("left")
                            ? "8px"
                            : "auto",
                          right: design.icon.position.includes("right")
                            ? "8px"
                            : "auto",
                        }}
                      >
                        {design.icon.emoji}
                      </div>
                    )}

                    {/* Badge */}
                    {design.badge.show && (
                      <div
                        style={{
                          backgroundColor: design.badge.bgColor,
                          color: design.badge.textColor,
                          fontSize: `${design.badge.fontSize}px`,
                          top: design.badge.position.includes("top")
                            ? "8px"
                            : "auto",
                          bottom: design.badge.position.includes("bottom")
                            ? "8px"
                            : "auto",
                          right: design.badge.position.includes("right")
                            ? "8px"
                            : "auto",
                          left: design.badge.position.includes("left")
                            ? "8px"
                            : "auto",
                        }}
                        className="absolute px-2 py-1 rounded-full font-bold shadow-lg"
                      >
                        {design.badge.text}
                      </div>
                    )}

                    {/* Title */}
                    <h2
                      style={{
                        color: design.title.color,
                        fontSize: "20px",
                        fontWeight: design.title.fontWeight,
                        fontFamily: design.title.fontFamily,
                        textAlign: "center",
                        textShadow: design.title.shadow
                          ? "2px 2px 4px rgba(0,0,0,0.5)"
                          : "none",
                        lineHeight: "1.2",
                      }}
                    >
                      {design.title.text}
                    </h2>

                    {/* Subtitle */}
                    {design.subtitle.text && (
                      <p
                        style={{
                          color: design.subtitle.color,
                          fontSize: "12px",
                          fontFamily: design.subtitle.fontFamily,
                          marginTop: "8px",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
                        }}
                      >
                        {design.subtitle.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}