// components/forms/DealCategoryForm.js
"use client";
import { useState, useEffect } from "react";
import { Upload, X, Palette, Save, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { getUser } from "@/lib/auth";
import CardDesigner from "../card_designer/CardDesigner";
export default function DealCategoryForm({ onSuccess, onCancel, initialData }) {
  const [showDesigner, setShowDesigner] = useState(false);
  const [savedDesigns, setSavedDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    image_url: "",
    card_design_data: null,
    card_design_id: null,
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    loadSavedDesigns();
    
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        price: initialData.price || "",
        image_url: initialData.image_url || "",
        card_design_data: initialData.card_design_data || null,
        card_design_id: initialData.card_design_id || null,
      });
      setImagePreview(initialData.image_url || "");
    }
  }, [initialData]);

  const loadSavedDesigns = async () => {
    try {
      const user = await getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("card_designs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedDesigns(data || []);
    } catch (error) {
      console.error("Error loading designs:", error);
    }
  };

  const uploadImage = async (file) => {
    if (!file) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `deals/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("deal-assets")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("deal-assets")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const uploadLogo = async (file) => {
    if (!file) return null;

    const fileExt = file.name.split(".").pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("deal-assets")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("deal-assets")
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDesignerSave = async (design, logoFile) => {
    let updatedDesign = { ...design };

    if (logoFile) {
      try {
        const logoUrl = await uploadLogo(logoFile);
        updatedDesign.logo.url = logoUrl;
        toast.success("Logo uploaded successfully!");
      } catch (error) {
        console.error("Error uploading logo:", error);
        toast.error("Failed to upload logo");
        return;
      }
    }

    setFormData({ ...formData, card_design_data: updatedDesign });
    setShowDesigner(false);
    toast.success("Design saved!");
  };

  const saveDesignToLibrary = async () => {
    if (!formData.card_design_data) {
      toast.error("No design to save");
      return;
    }

    const designName = prompt("Enter a name for this design:");
    if (!designName) return;

    try {
      setLoading(true);
      const user = await getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from("card_designs")
        .insert({
          user_id: user.id,
          name: designName,
          design_data: formData.card_design_data,
          is_template: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Design saved to library!");
      loadSavedDesigns();
      setFormData({ ...formData, card_design_id: data.id });
    } catch (error) {
      console.error("Error saving design:", error);
      toast.error("Failed to save design");
    } finally {
      setLoading(false);
    }
  };

  const loadDesignFromLibrary = (design) => {
    setFormData({
      ...formData,
      card_design_data: design.design_data,
      card_design_id: design.id,
    });
    toast.success(`Loaded design: ${design.name}`);
  };

  const deleteDesignFromLibrary = async (designId) => {
    if (!confirm("Are you sure you want to delete this design?")) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from("card_designs")
        .delete()
        .eq("id", designId);

      if (error) throw error;

      toast.success("Design deleted!");
      loadSavedDesigns();
      
      if (formData.card_design_id === designId) {
        setFormData({ ...formData, card_design_id: null });
      }
    } catch (error) {
      console.error("Error deleting design:", error);
      toast.error("Failed to delete design");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a deal name");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (!formData.card_design_data) {
      toast.error("Please design your card");
      return;
    }

    try {
      setLoading(true);
      const user = await getUser();
      if (!user) return;

      let imageUrl = formData.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const dealData = {
        user_id: user.id,
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        image_url: imageUrl,
        card_design_data: formData.card_design_data,
        card_design_id: formData.card_design_id,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from("deal_categories")
          .update(dealData)
          .eq("id", initialData.id);

        if (error) throw error;
        toast.success("Deal updated successfully!");
      } else {
        const { error } = await supabase
          .from("deal_categories")
          .insert(dealData);

        if (error) throw error;
        toast.success("Deal created successfully!");
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving deal:", error);
      toast.error("Failed to save deal");
    } finally {
      setLoading(false);
    }
  };

  const renderCardPreview = (design) => {
    if (!design) return null;

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

    return (
      <div
        style={{
          ...getBackgroundStyle(),
          borderRadius: `${design.border.radius}px`,
          border: design.border.width > 0
            ? `${design.border.width}px solid ${design.border.color}`
            : "none",
          position: "relative",
          overflow: "hidden",
        }}
        className={`w-full h-32 flex flex-col justify-center items-center p-2 ${getShadowClass(design.border.shadow)}`}
      >
        {design.logo?.show && design.logo?.url && (
          <img
            src={design.logo.url}
            alt="Logo"
            style={{
              position: "absolute",
              top: design.logo.position?.includes("top") ? "4px" : "auto",
              bottom: design.logo.position?.includes("bottom") ? "4px" : "auto",
              left: design.logo.position?.includes("left") ? "4px" : "auto",
              right: design.logo.position?.includes("right") ? "4px" : "auto",
              width: `${(design.logo.size || 60) * 0.5}px`,
              height: `${(design.logo.size || 60) * 0.5}px`,
              opacity: (design.logo.opacity || 100) / 100,
            }}
            className="object-contain"
          />
        )}

        {design.icon?.show && (
          <div
            style={{
              position: "absolute",
              fontSize: `${(design.icon.size || 48) * 0.4}px`,
              top: design.icon.position?.includes("top") ? "4px" : "auto",
              bottom: design.icon.position?.includes("bottom") ? "4px" : "auto",
              left: design.icon.position?.includes("left") ? "4px" : "auto",
              right: design.icon.position?.includes("right") ? "4px" : "auto",
            }}
          >
            {design.icon.emoji}
          </div>
        )}

        {design.badge?.show && (
          <div
            style={{
              backgroundColor: design.badge.bgColor,
              color: design.badge.textColor,
              position: "absolute",
              top: design.badge.position?.includes("top") ? "4px" : "auto",
              right: design.badge.position?.includes("right") ? "4px" : "auto",
              fontSize: `${(design.badge.fontSize || 12) * 0.7}px`,
            }}
            className="px-1.5 py-0.5 rounded-full font-bold"
          >
            {design.badge.text}
          </div>
        )}

        <h3
          style={{
            color: design.title.color,
            fontSize: "14px",
            fontWeight: design.title.fontWeight,
            fontFamily: design.title.fontFamily,
            textShadow: design.title.shadow ? "1px 1px 2px rgba(0,0,0,0.5)" : "none",
          }}
          className="text-center"
        >
          {design.title.text}
        </h3>

        {design.subtitle?.text && (
          <p
            style={{
              color: design.subtitle.color,
              fontSize: "9px",
              fontFamily: design.subtitle.fontFamily,
              marginTop: "2px",
            }}
          >
            {design.subtitle.text}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Deal Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Deal Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            placeholder="e.g., Family Deal, Student Special"
            required
          />
        </div>

        {/* Price in PKR */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Price (PKR) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium text-sm">
              Rs
            </span>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Card Design - Compact */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Card Design *
            </label>
            {formData.card_design_data && (
              <button
                type="button"
                onClick={saveDesignToLibrary}
                disabled={loading}
                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            )}
          </div>

          {formData.card_design_data ? (
            <div className="space-y-2">
              <div className="border-2 border-gray-200 dark:border-slate-600 rounded-lg p-2 bg-gray-50 dark:bg-slate-700">
                {renderCardPreview(formData.card_design_data)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowDesigner(true)}
                  className="py-1.5 px-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, card_design_data: null, card_design_id: null })}
                  className="py-1.5 px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDesigner(true)}
              className="w-full border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors group"
            >
              <div className="text-center">
                <Palette className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 mx-auto mb-1" />
                <p className="text-gray-600 dark:text-gray-300 font-medium text-xs">
                  Design Your Card
                </p>
              </div>
            </button>
          )}

          {/* Saved Designs Library - Compact */}
          {savedDesigns.length > 0 && !formData.card_design_data && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Saved designs:
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                {savedDesigns.map((design) => (
                  <div
                    key={design.id}
                    className="group relative border-2 border-gray-200 dark:border-slate-600 rounded-lg p-1.5 hover:border-indigo-500 transition-all cursor-pointer"
                    onClick={() => loadDesignFromLibrary(design)}
                  >
                    <div className="aspect-video rounded overflow-hidden mb-0.5">
                      {renderCardPreview(design.design_data)}
                    </div>
                    <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 truncate">
                      {design.name}
                    </p>
                    {!design.is_template && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDesignFromLibrary(design.id);
                        }}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Optional Image Upload - Compact */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Deal Image (Optional)
          </label>
          <div className="mt-1">
            {imagePreview ? (
              <div className="relative inline-block w-full">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview("");
                    setImageFile(null);
                    setFormData({ ...formData, image_url: "" });
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700">
                <Upload className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Click to upload
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : initialData ? "Update" : "Create"}
          </button>
        </div>
      </form>

      {/* Card Designer Modal */}
      {showDesigner && (
        <CardDesigner
          onSave={handleDesignerSave}
          onCancel={() => setShowDesigner(false)}
          initialDesign={formData.card_design_data}
        />
      )}
    </>
  );
}