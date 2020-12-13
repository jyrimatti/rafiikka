let initTooltips = context => {
    tippy(context.querySelectorAll('[title]'), {
        interactive: true,
        content(reference) {
            const title = reference.getAttribute('title');
            reference.removeAttribute('title');
            onTitleChange(reference, () => {
                let title = reference.getAttribute('title');
                if (title) {
                    reference._tippy.setContent(title);
                    reference.removeAttribute('title');
                }
            });
            return title;
        }
    });
};