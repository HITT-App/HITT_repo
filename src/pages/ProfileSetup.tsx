import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Shield, Fingerprint, Lock, KeyRound, ChevronRight } from 'lucide-react';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [faceId, setFaceId] = useState(true);
  const [passcode, setPasscode] = useState(false);
  const [pin, setPin] = useState(false);

  const securityOptions = [
    {
      id: 'faceid',
      icon: Fingerprint,
      title: 'Face ID',
      description: 'Use biometric authentication',
      enabled: faceId,
      onToggle: setFaceId,
    },
    {
      id: 'passcode',
      icon: Lock,
      title: 'Passcode',
      description: 'Set a device passcode',
      enabled: passcode,
      onToggle: setPasscode,
    },
    {
      id: 'pin',
      icon: KeyRound,
      title: 'PIN',
      description: 'Set a 4-digit PIN',
      enabled: pin,
      onToggle: setPin,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Security Settings</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Security Icon */}
        <div className="flex justify-center py-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Description */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Protect Your Account</h2>
          <p className="text-muted-foreground text-sm">
            Enable security features to keep your fitness data safe
          </p>
        </div>

        {/* Security Options */}
        <div className="space-y-3">
          {securityOptions.map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <option.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{option.title}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
              <Switch
                checked={option.enabled}
                onCheckedChange={option.onToggle}
              />
            </div>
          ))}
        </div>

        {/* Additional Settings */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-medium text-muted-foreground px-1">More Settings</h3>
          
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:bg-secondary/50 transition-colors"
          >
            <span className="font-medium">Edit Profile</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

          <button
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:bg-secondary/50 transition-colors"
          >
            <span className="font-medium">Change Password</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>

        </div>
      </div>
    </div>
  );
}
