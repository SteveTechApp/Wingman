import React, { useState, useEffect } from 'react';
import { useUserContext } from '../context/UserContext';
import { UserProfile, Product } from '../utils/types';
import { SUPPORTED_LANGUAGES } from '../data/constants';
import toast from 'react-hot-toast';
import ToggleSwitch from './ui/ToggleSwitch';
import InfoModal from './InfoModal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, updateUserProfile } = useUserContext();
  const [localProfile, setLocalProfile] = useState<UserProfile>(userProfile);

  useEffect(() => {
    // When the modal is opened, reset the local state to match the current user profile.
    // This ensures that each time the modal is opened, it starts with fresh, up-to-date data.
    // We intentionally omit `userProfile` from the dependency array because we *only* want
    // this effect to run when the modal's `isOpen` state changes from false to true.
    // If we included `userProfile`, any external update to the profile (like changing the resolution
    // in the footer) would overwrite the user's edits inside the modal.
    if (isOpen) {
      setLocalProfile(userProfile);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checkedValue = (e.target as HTMLInputElement).checked;
    
    setLocalProfile(prev => ({
      ...prev,
      [name]: isCheckbox ? checkedValue : value
    }));
  };

  const handleSave = () => {
    if (JSON.stringify(localProfile) !== JSON.stringify(userProfile)) {
        updateUserProfile(localProfile);
        const nameToDisplay = localProfile.name || "Profile";
        toast.success(`${nameToDisplay} saved!`);
    }
    onClose();
  };
  
  const parseCsvToProducts = (csvText: string): Product[] => {
    const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) throw new Error('CSV file must have a header row and at least one data row.');
    
    const headerLine = lines.shift() || '';
    const header = headerLine.split(',').map(h => h.trim().toLowerCase());
    
    const requiredHeaders = ['sku', 'description', 'category'];
    if (!requiredHeaders.every(h => header.includes(h))) {
        throw new Error('CSV is missing required headers: SKU, Description, Category.');
    }

    return lines.map((line): Product | null => {
        const row: { [key: string]: string } = {};
        // Regex to split by comma but ignore commas inside double quotes
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        
        header.forEach((key, i) => {
            let value = values[i] || '';
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            row[key] = value.trim();
        });
        
        if (!row.sku || !row.description) return null;

        return {
            sku: row.sku,
            name: row.description,
            category: row.category || 'Uncategorized',
            description: row.description || '',
            tags: [],
        };
    }).filter((p): p is Product => p !== null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          const text = e.target?.result as string;
          try {
              const products = parseCsvToProducts(text);
              setLocalProfile(prev => ({ ...prev, customProductDatabase: products }));
              toast.success(`${products.length} products imported successfully!`);
          } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Failed to parse CSV.');
          }
      };
      reader.readAsText(file);
      // Reset file input to allow re-upload of the same file
      event.target.value = '';
  };

  const handleRemoveCustomDb = () => {
    setLocalProfile(prev => {
        const { customProductDatabase, ...rest } = prev;
        return rest;
    });
    toast.success('Custom product database removed.');
  };

  const footer = (
    <>
      <button onClick={onClose} className="btn btn-secondary">Cancel</button>
      <button onClick={handleSave} className="btn btn-primary">Save Changes</button>
    </>
  );

  return (
    <InfoModal isOpen={isOpen} onClose={onClose} className="max-w-4xl" title="Pilot Profile & Settings" footer={footer}>
      <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label htmlFor="profile-name" className="block text-sm font-medium">Name</label>
                  <input type="text" id="profile-name" name="name" value={localProfile.name} onChange={handleChange} className="w-full p-2 border border-border-color rounded-md bg-input-bg mt-1" />
              </div>
               <div>
                  <label htmlFor="profile-company" className="block text-sm font-medium">Company</label>
                  <input type="text" id="profile-company" name="company" value={localProfile.company} onChange={handleChange} className="w-full p-2 border border-border-color rounded-md bg-input-bg mt-1" />
              </div>
              <div>
                  <label htmlFor="profile-language" className="block text-sm font-medium">Language</label>
                  <select id="profile-language" name="language" value={localProfile.language} onChange={handleChange} className="w-full p-2 border border-border-color rounded-md bg-input-bg mt-1">
                      {SUPPORTED_LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                  </select>
              </div>
              <div>
                  <label htmlFor="profile-unit-system" className="block text-sm font-medium">Unit System</label>
                  <select id="profile-unit-system" name="unitSystem" value={localProfile.unitSystem} onChange={handleChange} className="w-full p-2 border border-border-color rounded-md bg-input-bg mt-1">
                      <option value="metric">Metric (meters)</option>
                      <option value="imperial">Imperial (feet)</option>
                  </select>
              </div>
          </div>
          <div>
              <h3 className="text-lg font-semibold mb-2">Appearance</h3>
              <div className="flex items-center justify-between p-3 bg-background rounded-md border border-border-color">
                  <label htmlFor="show-background" className="text-sm font-medium">Show Background Image Carousel</label>
                  <ToggleSwitch
                      checked={localProfile.showBackground}
                      onChange={(isChecked) => setLocalProfile(p => ({ ...p, showBackground: isChecked }))}
                      offColor="bg-gray-400"
                  />
              </div>
          </div>
          <div>
              <h3 className="text-lg font-semibold mb-2">Custom Product Database</h3>
              <div className="p-3 bg-background rounded-md border border-border-color">
                  <label htmlFor="product-db-upload" className="block text-sm font-medium">Upload Product CSV</label>
                  <p className="text-xs text-text-secondary mb-2">
                      Import a custom product list. New projects will use this database instead of the default.
                      Required columns: <strong>SKU, Description, Category</strong>.
                  </p>
                  <input 
                      type="file" 
                      id="product-db-upload" 
                      accept=".csv" 
                      onChange={handleFileChange} 
                      className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent-bg-subtle file:text-accent hover:file:bg-accent-bg-very-subtle"
                  />
                  {localProfile.customProductDatabase && (
                      <div className="mt-2 text-sm text-green-600">
                          <p>
                              Custom database with {localProfile.customProductDatabase.length} products is active. 
                              <button onClick={handleRemoveCustomDb} className="ml-2 text-red-500 underline text-xs">Remove</button>
                          </p>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </InfoModal>
  );
};

export default ProfileModal;