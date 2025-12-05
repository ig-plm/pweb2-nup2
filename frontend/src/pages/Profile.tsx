import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/api/auth';
import { Loader2, User, Edit3, Save, X, Upload } from 'lucide-react';

// Schema agora valida apenas texto, arquivo é tratado separadamente por enquanto ou via custom validation
const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { user, tokens, updateUser } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
      });
    }
  }, [user, reset]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!tokens?.accessToken) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      // Backend ignora email update por segurança, mas enviamos se necessário
      // formData.append('email', data.email); 

      if (selectedFile) {
        formData.append('profile_picture', selectedFile);
      }

      const updatedUser = await updateProfile(tokens.accessToken, formData);

      if (updatedUser) {
        updateUser(updatedUser);
        setIsEditing(false);
        setSelectedFile(null);
        setPreviewUrl(null);
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset({
      name: user?.name || '',
      email: user?.email || '',
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Meu Perfil</CardTitle>
            <CardDescription>
              Gerencie suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                <AvatarImage src={previewUrl || user?.profile_picture} alt={user?.name} className="object-cover" />
                <AvatarFallback className="text-4xl bg-gray-200">
                  {user?.name ? getInitials(user.name) : <User className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>

              {isEditing && (
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="profile-upload"
                    onChange={handleFileChange}
                  />
                  <Label
                    htmlFor="profile-upload"
                    className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Alterar Foto
                  </Label>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-semibold">{user?.name}</h3>
                <p className="text-gray-500">{user?.email}</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  {...register('name')}
                  disabled={!isEditing}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  disabled // Email geralmente não é editável facilmente
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                {!isEditing ? (
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Editar Perfil</span>
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Cancelar</span>
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center space-x-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Salvar Alterações</span>
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
