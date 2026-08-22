import NotificationsIcon from "../icons/NotificationsIcon";

    type Notification = {
      id: number;
     text: string;
    }

    type NotificationsProps = {
        notifications: Notification[];
    }

    function Notifications({ notifications }: NotificationsProps) {
        if (notifications.length === 0) {
            return null;
        }

    return (

        <section className="w-full border p-2 rounded-md border-[#2f3b48] bg-[#242f3d] pl-2 
        text-[#a8b5c3] flex items-center gap-2">
            <NotificationsIcon />

            {notifications.map((notification) => (
                <p key={notification.id} className="mr-2">{notification.text}</p>
            ))}
        </section>

    );

}

export default Notifications;
