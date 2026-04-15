
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ProfileCard = () => {
  const { profile, user, signOut } = useAuth();

  const getInitials = () => {
    if (!profile) return "?";
    
    const firstInitial = profile.first_name ? profile.first_name[0] : "";
    const lastInitial = profile.last_name ? profile.last_name[0] : "";
    return (firstInitial + lastInitial).toUpperCase();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center text-center">
        <Avatar className="h-24 w-24 mb-4">
          {profile?.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt={profile?.first_name || "User"} />
          ) : (
            <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
          )}
        </Avatar>
        
        <h3 className="text-xl font-medium">
          {profile?.first_name} {profile?.last_name}
        </h3>
        
        <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
        
        <div className="grid w-full gap-2 mt-4">
          <Button variant="outline" size="sm" asChild>
            <a href="/profile">Edit Profile</a>
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
